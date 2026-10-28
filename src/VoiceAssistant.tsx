import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { authenticateWithBiometrics } from './biometricAuth'

import './VoiceAssistant.css'

interface VoiceAssistantProps {
  language: 'es' | 'en'
  onLanguageChange: (language: 'es' | 'en') => void
  onNavigate: (section: string) => void
  onAnalyzeMessage: (text: string) => void
  onSetMessage: (text: string) => void
  checklistTasks: Array<{
    title: string
    titleEs: string
    aliases: string[]
    completed: boolean
  }>
  onToggleChecklistTask: (index: number, completed: boolean) => void
  onGenerateSecurityPlan: () => 'started' | 'current' | 'busy'
}

interface SpeechResult {
  0: { transcript: string }
}

interface SpeechEventLike {
  results: ArrayLike<SpeechResult>
}

interface SpeechErrorLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEventLike) => void) | null
  onerror: ((event: SpeechErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type ListeningMode = 'command' | 'chat'

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export default function VoiceAssistant({
  language,
  onLanguageChange,
  onNavigate,
  onAnalyzeMessage,
  onSetMessage,
  checklistTasks,
  onToggleChecklistTask,
  onGenerateSecurityPlan,
}: VoiceAssistantProps) {
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('Escribe un comando o usa el micrófono.')
  const [listening, setListening] = useState(false)
  const [listeningMode, setListeningMode] = useState<ListeningMode>('command')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatError, setChatError] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const chatBusyRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speakRef = useRef<(text: string) => void>(() => {})
  const [alertUserId, setAlertUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAlertUserId(session?.user.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !alertUserId) return

    const client = supabase
    const channel = client
      .channel(`sophia-security-alerts-${alertUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_alerts',
          filter: `user_id=eq.${alertUserId}`,
        },
        (payload) => {
          if (payload.new.severity !== 'high') return

          const alertMessage =
            language === 'es'
              ? 'Alerta de seguridad de alta gravedad recibida. Revisa el panel para ver los detalles.'
              : 'A high-severity security alert was received. Review your dashboard for details.'

          setStatus(alertMessage)
          speakRef.current(alertMessage)
          window.dispatchEvent(
            new CustomEvent('sophia-alert', {
              detail: {
                id: payload.new.id,
                severity: 'high',
                created_at: payload.new.created_at,
              },
            })
          )
        }
      )
      .subscribe((subscriptionStatus, error) => {
        if (
          subscriptionStatus === 'CHANNEL_ERROR' ||
          subscriptionStatus === 'TIMED_OUT'
        ) {
          console.error('Security alert subscription failed.', error)
          setStatus(
            language === 'es'
              ? 'No se pudo conectar con las alertas de seguridad.'
              : 'Could not connect to security alerts.'
          )
        }
      })

    return () => {
      void client.removeChannel(channel).then((status) => {
        if (status !== 'ok') {
          console.error('Could not cleanly stop the security alert subscription.', status)
        }
      })
    }
  }, [alertUserId, language])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  async function speak(text: string) {
    if (!('speechSynthesis' in window)) {
      setStatus(
        language === 'es'
          ? 'La reproducción de voz no está disponible en este navegador.'
          : 'Speech playback is not supported in this browser.'
      )
      return
    }

    const synth = window.speechSynthesis
    synth.cancel()

    let voices = synth.getVoices()
    if (voices.length === 0) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const timeout = window.setTimeout(() => {
          synth.removeEventListener('voiceschanged', handleVoicesChanged)
          resolve(synth.getVoices())
        }, 1500)

        function handleVoicesChanged() {
          window.clearTimeout(timeout)
          synth.removeEventListener('voiceschanged', handleVoicesChanged)
          resolve(synth.getVoices())
        }

        synth.addEventListener('voiceschanged', handleVoicesChanged)
      })
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'es' ? 'es-MX' : 'en-US'
    utterance.rate = language === 'es' ? 1.02 : 0.96
    utterance.pitch = language === 'es' ? 1.12 : 1.04

    const chooseVoice = () => {
      if (language === 'es') {
        const mexicanVoices = voices.filter((voice) =>
          /^es[-_]MX$/i.test(voice.lang)
        )
        const preferredNames = [
          'paulina',
          'flo',
          'sandy',
          'shelley',
          'monica',
          'lucia',
          'sofia',
          'carmen',
        ]

        return preferredNames
          .map((name) =>
            mexicanVoices.find((voice) =>
              voice.name.toLocaleLowerCase().includes(name)
            )
          )
          .find((voice) => voice !== undefined)
      }

      return (
        voices.find(
          (voice) =>
            ['en-us', 'en-ca', 'en-au', 'en-gb'].includes(voice.lang.toLowerCase()) &&
            /samantha|ava|victoria|allison|susan|zira|karen|tessa/i.test(voice.name)
        ) ??
        voices.find((voice) => /^en[-_]US$/i.test(voice.lang)) ??
        voices.find((voice) => /^en([_-]|$)/i.test(voice.lang))
      )
    }

    const voice = chooseVoice()
    if (language === 'es' && !voice) {
      setStatus(
        'No hay una voz femenina de español de México disponible. Instala una voz como Paulina en los ajustes de voz del dispositivo.'
      )
      return
    }
    if (voice) utterance.voice = voice

    utterance.onstart = () =>
      setStatus(
        language === 'es'
          ? `Sophia está hablando con la voz ${voice?.name ?? 'seleccionada'}…`
          : 'Sophia is speaking…'
      )

    synth.speak(utterance)

    if (synth.paused) synth.resume()
  }

  speakRef.current = speak

  function processCommand(rawCommand: string) {
    const text = rawCommand ? String(rawCommand).trim() : ''
    
    // Normalize string: lowercase, remove accents, strip quotes/punctuation
    const normalized = text
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/["'“”‘’.,!?¿¡]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const spanish = language === 'es'

    if (/^(switch to english|change language to english|use english|cambia a ingles|cambiar a ingles|usa ingles)$/.test(normalized)) {
      onLanguageChange('en')
      const languageMessage = spanish ? 'Cambiando a inglés.' : 'Sophia switched to English.'
      setStatus(languageMessage)
      speak(languageMessage)
      return
    }

    if (/^(switch to spanish|change language to spanish|use spanish|cambia a espanol|cambiar a espanol|usa espanol)$/.test(normalized)) {
      onLanguageChange('es')
      const languageMessage = spanish ? 'Sophia cambió a español.' : 'Switching Sophia to Spanish.'
      setStatus(languageMessage)
      speak(languageMessage)
      return
    }

    if (!text) {
      setStatus(spanish ? 'Escribe o di un comando primero.' : 'Please type or say a command first.')
      return
    }

    setCommand(text)

    if (/^(help|commands|ayuda|comandos|show commands|muestra comandos)$/.test(normalized)) {
      const helpMessage = spanish
        ? 'Puedo abrir las herramientas, analizar un mensaje que dictes, leer el progreso de seguridad, marcar una tarea específica como completada si me lo indicas, generar el plan de seguridad con IA cuando lo pidas, cambiar de idioma o responder preguntas de ciberseguridad.'
        : 'I can open app tools, analyze a message you dictate, read your security checklist progress, mark a specific checklist task complete when you ask, generate the AI security plan on request, switch languages, and answer cybersecurity questions.'
      setStatus(helpMessage)
      speak(helpMessage)
      return
    }

    if (
      /^(what is my security score|whats my security score|how is my security|how is my security checklist|read my security progress|checklist status|how many security tasks are complete|como va mi seguridad|como esta mi seguridad|lee mi progreso de seguridad|estado de la lista|cuantas tareas de seguridad he completado)$/.test(normalized)
    ) {
      const completedCount = checklistTasks.filter((task) => task.completed).length
      const nextTask = checklistTasks.find((task) => !task.completed)
      const progressMessage = spanish
        ? `Has completado ${completedCount} de ${checklistTasks.length} tareas de seguridad. ${nextTask ? `El siguiente paso de la lista es: ${nextTask.titleEs}.` : 'Completaste todas las tareas de la lista. Revisa los controles con regularidad.'}`
        : `You have completed ${completedCount} of ${checklistTasks.length} security tasks. ${nextTask ? `The next checklist task is: ${nextTask.title}.` : 'You completed every checklist task. Review your controls regularly.'}`
      setStatus(progressMessage)
      speak(progressMessage)
      return
    }

    if (/^(what should i do next|whats next|what is next|next security task|what is my next step|que sigue|que debo hacer ahora|cual es el siguiente paso)$/.test(normalized)) {
      const nextTask = checklistTasks.find((task) => !task.completed)
      const nextMessage = nextTask
        ? spanish
          ? `El siguiente paso sugerido es: ${nextTask.titleEs}. ${checklistTasks.filter((task) => task.completed).length} de ${checklistTasks.length} tareas están marcadas.`
          : `Your next suggested step is: ${nextTask.title}. ${checklistTasks.filter((task) => task.completed).length} of ${checklistTasks.length} tasks are marked complete.`
        : spanish
          ? 'Todas las tareas de la lista están marcadas. Revisa periódicamente que los controles sigan activos.'
          : 'Every checklist task is marked. Review periodically to make sure the controls remain in place.'
      setStatus(nextMessage)
      speak(nextMessage)
      return
    }

    const taskAction = normalized.match(
      /^(?:please )?(mark|check off|complete|finish|uncheck|reopen|marca|marcar|completa|completar|desmarca|desmarcar)\s+(?:the\s+)?(.+?)(?:\s+(?:as\s+)?(complete|completed|done|incomplete|not complete|pendiente|completada|completado|incompleta|incompleto))?$/
    )
    if (taskAction) {
      const [, action, taskName, finalStatus] = taskAction
      const requestedTask = taskName.trim()
      const shouldComplete =
        finalStatus
          ? !/\b(incomplete|not complete|pendiente|incompleta|incompleto)\b$/.test(finalStatus)
          : !/^(uncheck|reopen|desmarca|desmarcar)$/.test(action)
      const taskIndex = checklistTasks.findIndex((task) =>
        [task.title, task.titleEs, ...task.aliases].some((alias) =>
          requestedTask.includes(
            alias
              .toLocaleLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
          )
        )
      )

      if (taskIndex === -1) {
        const unknownTask = spanish
          ? 'No reconocí esa tarea de la lista. Di su nombre completo o pregunta “ayuda”.'
          : 'I could not match that checklist task. Say its full name or ask for “help”.'
        setStatus(unknownTask)
        speak(unknownTask)
        return
      }

      if (checklistTasks[taskIndex].completed === shouldComplete) {
        const alreadySet = spanish
          ? shouldComplete
            ? 'Esa tarea ya está marcada como completada.'
            : 'Esa tarea ya está pendiente.'
          : shouldComplete
            ? 'That task is already marked complete.'
            : 'That task is already marked incomplete.'
        setStatus(alreadySet)
        speak(alreadySet)
        return
      }

      onToggleChecklistTask(taskIndex, shouldComplete)
      const taskMessage = spanish
        ? `${checklistTasks[taskIndex].titleEs}: marcada como ${shouldComplete ? 'completada' : 'pendiente'}. Esto registra tu confirmación; no verifica el control.`
        : `${checklistTasks[taskIndex].title}: marked ${shouldComplete ? 'complete' : 'incomplete'}. This records your confirmation; it does not verify the control.`
      setStatus(taskMessage)
      speak(taskMessage)
      return
    }

    if (
      /^(?:generate|create|make|build|genera|generar|crea|crear)\s+(?:my\s+|a\s+|the\s+|mi\s+|un\s+|el\s+)?(?:ai\s+|ia\s+)?(?:security|safety|seguridad)\s+(?:action\s+)?plan$/.test(normalized) ||
      /^(?:generate|create|make|genera|generar|crea|crear)\s+(?:my\s+|mi\s+)?(?:ai\s+|ia\s+)?plan(?: de seguridad)?$/.test(normalized)
    ) {
      const planMessage = spanish
        ? 'Generando tu plan de seguridad con IA según el progreso de la lista.'
        : 'Generating your AI security plan from the checklist progress.'
      const requestStatus = onGenerateSecurityPlan()
      if (requestStatus !== 'started') {
        const requestMessage = requestStatus === 'busy'
          ? spanish
            ? 'Ya se está generando un plan. Espera a que termine.'
            : 'A plan is already being generated. Please wait for it to finish.'
          : spanish
            ? 'Tu plan ya está actualizado para el estado actual de la lista. No se envió otra solicitud de IA.'
            : 'Your plan is already up to date for the current checklist. No additional AI request was sent.'
        setStatus(requestMessage)
        speak(requestMessage)
        return
      }
      setStatus(planMessage)
      speak(planMessage)
      return
    }

    // Stop speaking command
    if (/^(stop|quiet|silence|silencio|detener|callate|para)(\s+(speaking|talking|de hablar|de voz))?$/.test(normalized)) {
      window.speechSynthesis?.cancel()
      setStatus(spanish ? 'Respuesta de voz detenida.' : 'Voice response stopped.')
      return
    }

    const isNavigationRequest =
      /^(open|show|go to|navigate to|take me to|abrir|abre|muestra|ir a|ve a|llevame a)\b/.test(
        normalized
      )

    // Route explicit navigation requests; security questions should go to chat.
    if (
      isNavigationRequest &&
      /\b(threat|analyzer|analizador|amenazas)\b/.test(normalized)
    ) {
      onNavigate('threat-analyzer')
      setStatus(spanish ? 'Abrí el analizador de amenazas.' : 'Opened the Threat Analyzer.')
      speak(spanish ? 'Abriendo el analizador de amenazas.' : 'Opening the Threat Analyzer.')
      return
    }

    if (
      isNavigationRequest &&
      /\b(security|checkup|checklist|revision|seguridad)\b/.test(normalized)
    ) {
      onNavigate('security-checkup')
      setStatus(spanish ? 'Abrí la revisión de seguridad.' : 'Opened the Security Checkup.')
      speak(spanish ? 'Abriendo la revisión de seguridad.' : 'Opening the Security Checkup.')
      return
    }

    if (
      isNavigationRequest &&
      /\b(incident|response|respuesta|incidentes)\b/.test(normalized)
    ) {
      onNavigate('incident-response')
      setStatus(spanish ? 'Abrí la respuesta a incidentes.' : 'Opened Incident Response.')
      speak(spanish ? 'Abriendo la respuesta a incidentes.' : 'Opening Incident Response.')
      return
    }

    if (
      isNavigationRequest &&
      /\b(overview|home|inicio|resumen)\b/.test(normalized)
    ) {
      onNavigate('overview')
      setStatus(spanish ? 'Abrí el resumen.' : 'Opened Overview.')
      speak(spanish ? 'Abriendo el resumen.' : 'Opening Overview.')
      return
    }

    if (
      isNavigationRequest &&
      /\b(mobile|device|posture|movil|dispositivo)\b/.test(normalized)
    ) {
      onNavigate('mobile-device-posture')
      setStatus(
        spanish ? 'Abrí el estado del dispositivo móvil.' : 'Opened Mobile Device Posture.'
      )
      speak(
        spanish ? 'Abriendo el estado del dispositivo móvil.' : 'Opening Mobile Device Posture.'
      )
      return
    }

    if (isNavigationRequest && /\b(firewall|cortafuegos)\b/.test(normalized)) {
      onNavigate('firewall-checkup')
      setStatus(spanish ? 'Abrí la revisión del firewall.' : 'Opened Firewall Checkup.')
      speak(spanish ? 'Abriendo la revisión del firewall.' : 'Opening Firewall Checkup.')
      return
    }

    if (isNavigationRequest && /\b(cookie|cookies|privacy|privacidad)\b/.test(normalized)) {
      onNavigate('cookie-privacy')
      setStatus(spanish ? 'Abrí la revisión de privacidad.' : 'Opened Cookie Privacy Checkup.')
      speak(spanish ? 'Abriendo la revisión de privacidad.' : 'Opening Cookie Privacy Checkup.')
      return
    }

    if (
      isNavigationRequest &&
      /\b(password|passwords|contrasena|contrasenas)\b/.test(normalized)
    ) {
      onNavigate('password-checker')
      setStatus(spanish ? 'Abrí el verificador de contraseñas.' : 'Opened Password Checker.')
      speak(spanish ? 'Abriendo el verificador de contraseñas.' : 'Opening Password Checker.')
      return
    }

    // Email Analysis match (Matches "analyze", "check", "analiza", "revisa", etc.)
    const analysisMatch =
      text.match(
        /^(?:(?:please|por favor)\s+)?(?:analyze|analyse|check|inspect|analiza|analizar|revisa|revisar|verifica|verificar)\s+(?:(?:this|este|esta)\s+)?(?:email|e-mail|message|text|correo|mensaje|texto)\s*[:-]?\s*([\s\S]+)$/i
      ) ??
      text.match(
        /^(?:(?:please|por favor)\s+)?(?:analyze|analyse|check|inspect|analiza|analizar|revisa|revisar|verifica|verificar)\s*:\s*([\s\S]+)$/i
      )

    if (analysisMatch?.[1]?.trim()) {
      const message = analysisMatch[1].trim()
      onSetMessage(message)
      onNavigate('threat-analyzer')
      onAnalyzeMessage(message)
      setStatus(
        spanish
          ? 'Envié el mensaje al analizador de amenazas.'
          : 'Sent the message to the Threat Analyzer.'
      )
      speak(spanish ? 'Analizando el mensaje.' : 'Analyzing the message.')
      return
    }

    void sendChatMessage(text)
  }

  async function sendChatMessage(messageText = chatInput) {
    const message = messageText.trim()

    if (!message || chatBusyRef.current) return

    if (!supabase) {
      setChatError(
        language === 'es'
          ? 'Sophia no está configurada. Revisa la configuración de la aplicación.'
          : 'Sophia is not configured. Please check the app configuration.'
      )
      return
    }

    const spanish = language === 'es'
    const history = chatMessages.slice(-8)
    chatBusyRef.current = true
    setChatBusy(true)
    setChatError('')
    setChatMessages((current) => [...current, { role: 'user', content: message }])
    setStatus(spanish ? 'Consultando a Sophia…' : 'Asking Sophia…')

    try {
      const { data, error } = await supabase.functions.invoke('sophia-chat', {
        body: {
          message,
          history,
        },
      })

      if (error) {
        throw error
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      if (typeof data?.reply !== 'string' || !data.reply.trim()) {
        throw new Error('Sophia returned an empty response.')
      }

      const reply = data.reply.trim()
      setChatMessages((current) => [...current, { role: 'assistant', content: reply }])
      setChatInput('')
      setStatus(spanish ? 'Sophia respondió.' : 'Sophia replied.')
      speak(reply)
    } catch (error) {
      console.error('Sophia chat request failed.')
      let errorMessage =
        error instanceof Error
          ? error.message
          : spanish
            ? 'Sophia no pudo responder. Inténtalo de nuevo.'
            : 'Sophia could not respond. Please try again.'

      if (
        error !== null &&
        typeof error === 'object' &&
        'context' in error &&
        error.context instanceof Response
      ) {
        const responseBody: unknown = await error.context
          .clone()
          .json()
          .catch(() => null)

        if (
          responseBody !== null &&
          typeof responseBody === 'object' &&
          'error' in responseBody &&
          typeof responseBody.error === 'string'
        ) {
          errorMessage = responseBody.error
        }
      }

      setChatError(errorMessage)
      setStatus(errorMessage)
    } finally {
      chatBusyRef.current = false
      setChatBusy(false)
    }
  }

  function clearChat() {
    if (chatBusyRef.current) return
    setChatMessages([])
    setChatError('')
    setStatus(
      language === 'es' ? 'Conversación borrada.' : 'Conversation cleared.'
    )
  }

  function startListening(mode: ListeningMode = 'command') {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }

    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setStatus(
        language === 'es'
          ? 'El reconocimiento de voz no está disponible en este navegador. Escribe tu pregunta.'
          : 'Speech recognition is not supported in this browser. Type your question instead.'
      )
      return
    }

    try {
      recognitionRef.current?.stop()

      const recognition = new Recognition()
      recognition.lang = language === 'es' ? 'es-MX' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript
        if (!transcript) return

        if (mode === 'chat') {
          setChatInput(transcript)
          void sendChatMessage(transcript)
        } else {
          processCommand(transcript)
        }
      }

      recognition.onerror = (event) => {
        const errorMessage =
          event.error === 'not-allowed'
            ? language === 'es'
              ? 'Permite el acceso al micrófono para usar la voz.'
              : 'Allow microphone access to use voice input.'
            : language === 'es'
              ? 'No se pudo reconocer la voz. Revisa el micrófono o escribe tu mensaje.'
              : 'Voice recognition failed. Check your microphone or type your message.'
        setStatus(errorMessage)
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
        setListeningMode('command')
      }

      recognitionRef.current = recognition
      setListeningMode(mode)
      setListening(true)
      setStatus(
        mode === 'chat'
          ? language === 'es'
            ? 'Escuchando tu pregunta para Sophia…'
            : 'Listening for your question to Sophia…'
          : language === 'es'
            ? 'Escuchando un comando de ShieldPocket…'
            : 'Listening for a ShieldPocket command…'
      )
      recognition.start()
    } catch {
      setListening(false)
      setStatus(
        language === 'es'
          ? 'No se pudo iniciar el micrófono. Puedes escribir en su lugar.'
          : 'Could not start the microphone. You can type instead.'
      )
    }
  }

  return (
    <section className="content-card voice-assistant">
      <div className="card-heading">
        <div>
          <h2>{language === 'es' ? 'Sophia — Asistente de seguridad' : 'Sophia — Security Assistant'}</h2>
          <p>
            {language === 'es'
              ? 'Usa tu voz para abrir herramientas, revisar la lista de seguridad, crear un plan y analizar mensajes.'
              : 'Use your voice to open tools, review your security checklist, create a plan, and analyze messages.'}
          </p>
        </div>
        <span className="demo-tag">VOICE BETA</span>
      </div>

      <div className="voice-language-picker">
        <label htmlFor="sophia-language">{language === 'es' ? 'Idioma de Sophia' : "Sophia's language"}</label>
        <select id="sophia-language" value={language} onChange={(event) => onLanguageChange(event.target.value as 'es' | 'en')}>
          <option value="es">Español (México)</option>
          <option value="en">English (US)</option>
        </select>
        <p className="voice-language-help">{language === 'es' ? 'La voz y el micrófono usarán español.' : 'Voice and microphone will use English.'}</p>
      </div>

      <div className="voice-assistant-intro">
        <span className="voice-assistant-icon" aria-hidden="true">
          {listening ? '🎙️' : '🔊'}
        </span>
        <div>
          <strong>
            {listening
              ? listeningMode === 'chat'
                ? language === 'es'
                  ? 'Escuchando tu pregunta…'
                  : 'Listening for your question…'
                : language === 'es'
                  ? 'Escuchando…'
                  : 'Listening now'
              : language === 'es'
                ? 'Lista para ayudarte'
                : 'Ready to help'}
          </strong>
          <p>
            {language === 'es' ? 'El acceso al micrófono depende de tu navegador y de los permisos.' : 'Microphone access depends on your browser and permission settings.'}
          </p>
        </div>
      </div>

      <label htmlFor="voice-command">{language === 'es' ? 'Di o escribe un comando' : 'Say or type a command'}</label>
      <textarea
        id="voice-command"
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder={
          language === 'es'
            ? 'Prueba: abre el analizador de amenazas\nO: analiza correo: Tu cuenta será desactivada hoy. Verifica tu contraseña.'
            : 'Try: open threat analyzer\nOr: analyze email: Your account will be disabled today. Verify your password.'
        }
        rows={3}
      />

      <div className="voice-assistant-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            speak(
              language === 'es'
                ? 'Hola, soy Sophia, tu asistente de seguridad de ShieldPocket. Estoy lista para ayudarte a revisar mensajes sospechosos y tu lista de seguridad.'
                : 'Hello, I am Sophia, your ShieldPocket security assistant. I am ready to help you check suspicious messages and review your security checklist.'
            )
          }
        >
          {language === 'es' ? '🔊 Probar la voz de Sophia' : "🔊 Test Sophia's Voice"}
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() => startListening('command')}
          disabled={listening}
        >
          {listening ? (language === 'es' ? 'Escuchando…' : 'Listening…') : (language === 'es' ? '🎙 Comenzar a hablar' : '🎙 Start talking')}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => processCommand(command)}
        >
          {language === 'es' ? 'Ejecutar comando' : 'Run command'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={async () => {
            setStatus(
              language === 'es'
                ? 'Verificando la biometría del dispositivo…'
                : 'Checking device biometrics…'
            )

            try {
              const result = await authenticateWithBiometrics()
              setStatus(result.message)
              if (result.success) {
                speak(
                  language === 'es'
                    ? 'Verificación biométrica exitosa.'
                    : 'Biometric verification successful.'
                )
              }
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : language === 'es'
                    ? 'La verificación biométrica no se completó.'
                    : 'Biometric verification was not completed.'
              )
            }
          }}
        >
          🔒 {language === 'es' ? 'Verificar biometría del dispositivo' : 'Check device biometrics'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            recognitionRef.current?.stop()
            setListening(false)
            window.speechSynthesis?.cancel()
            setStatus(language === 'es' ? 'Respuesta de voz detenida.' : 'Voice response stopped.')
          }}
        >
          {language === 'es' ? 'Detener' : 'Stop'}
        </button>
      </div>

      <p className="voice-assistant-status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="voice-command-examples">
        <ul>
          {language === 'es' ? (
            <>
              <li>“Ayuda” para ver comandos disponibles</li>
              <li>“Abre el analizador de amenazas”</li>
              <li>“Abre la revisión de seguridad”</li>
              <li>“Abre el estado del dispositivo móvil”</li>
              <li>“Abre la respuesta a incidentes”</li>
              <li>“Analiza correo:”, seguido del mensaje que quieres revisar</li>
              <li>“¿Cómo va mi seguridad?” para escuchar el progreso de la lista</li>
              <li>“Marca activar MFA como completada” para registrar una tarea verificada por ti</li>
              <li>“Genera mi plan de seguridad” para pedir un plan con IA</li>
              <li>“Cambia a inglés” para cambiar el idioma de Sophia</li>
            </>
          ) : (
            <>
              <li>“Help” to hear available commands</li>
              <li>“Open threat analyzer”</li>
              <li>“Open security checkup”</li>
              <li>“Open mobile posture”</li>
              <li>“Open incident response”</li>
              <li>“Analyze email:” followed by the message you want checked</li>
              <li>“How is my security?” to hear checklist progress</li>
              <li>“Mark enable multifactor authentication complete” to record a task you verified</li>
              <li>“Generate my security plan” to request an AI plan</li>
              <li>“Switch to Spanish” to change Sophia’s language</li>
            </>
          )}
        </ul>
      </div>

      <div className="sophia-chat">
        <h3>{language === 'es' ? 'Habla con Sophia' : 'Chat with Sophia'}</h3>
        <p>
          {language === 'es'
            ? 'Haz preguntas de ciberseguridad por texto o voz. Sophia conserva el contexto reciente durante esta sesión.'
            : 'Ask cybersecurity questions by text or voice. Sophia keeps recent context during this session.'}
        </p>

        <label htmlFor="sophia-chat-input">
          {language === 'es' ? 'Tu mensaje' : 'Your message'}
        </label>
        <textarea
          id="sophia-chat-input"
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={
            language === 'es'
              ? '¿Cómo puedo reconocer un correo de phishing?'
              : 'How can I recognize a phishing email?'
          }
          rows={3}
          disabled={chatBusy}
        />

        <div className="sophia-chat-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => void sendChatMessage()}
            disabled={chatBusy || !chatInput.trim()}
          >
            {chatBusy
              ? (language === 'es' ? 'Pensando…' : 'Thinking…')
              : (language === 'es' ? 'Enviar mensaje' : 'Send message')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => startListening('chat')}
            disabled={listening || chatBusy}
          >
            {language === 'es' ? '🎙 Preguntar por voz' : '🎙 Ask by voice'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={clearChat}
            disabled={!chatMessages.length || chatBusy}
          >
            {language === 'es' ? 'Borrar conversación' : 'Clear conversation'}
          </button>
        </div>

        {chatError && (
          <p className="sophia-chat-error" role="alert">
            {chatError}
          </p>
        )}

        {chatMessages.length > 0 && (
          <div
            className="sophia-chat-transcript"
            role="log"
            aria-label={language === 'es' ? 'Conversación con Sophia' : 'Conversation with Sophia'}
            aria-live="polite"
            aria-relevant="additions"
          >
            {chatMessages.map((message, index) => (
              <article
                className={`sophia-chat-message sophia-chat-message-${message.role}`}
                key={`${index}-${message.role}`}
              >
                <strong>
                  {message.role === 'assistant'
                    ? 'Sophia'
                    : language === 'es'
                      ? 'Tú'
                      : 'You'}
                </strong>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="disclaimer">
        {language === 'es'
          ? 'Versión beta: los comandos de navegación usan herramientas visibles de ShieldPocket. Las preguntas del chat y el texto que envías para analizar se procesan con los servicios de IA configurados. Sophia no puede acceder a tu bandeja de entrada, iniciar sesión en otros sitios ni ejecutar acciones de contención.'
          : 'Beta: navigation commands use ShieldPocket’s visible tools. Chat questions and submitted text are processed by the configured AI services. Sophia cannot access your inbox, sign in to other websites, or execute containment actions.'}
      </p>
    </section>
  )
}