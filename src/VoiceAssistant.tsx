import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { authenticateWithBiometrics } from './biometricAuth'

import './VoiceAssistant.css'

interface VoiceAssistantProps {
  onNavigate: (section: string) => void
  onAnalyzeMessage: (text: string) => void
  onSetMessage: (text: string) => void
}

interface SpeechResult {
  0: { transcript: string }
}

interface SpeechEventLike {
  results: ArrayLike<SpeechResult>
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export default function VoiceAssistant({
  onNavigate,
  onAnalyzeMessage,
  onSetMessage,
}: VoiceAssistantProps) {
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState(
    'Type a command or use your microphone.'
  )
  const [listening, setListening] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatReply, setChatReply] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
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

  function speak(text: string) {
    if (!('speechSynthesis' in window)) {
      setStatus('Speech playback is not supported in this browser.')
      return
    }

    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'es' ? 'es-MX' : 'en-US'
    utterance.rate = 0.96
    utterance.pitch = 1.04

    const chooseVoice = () => {
      const voices = synth.getVoices()

      if (language === 'es') {
        return (
          voices.find(
            (voice) =>
              /^es[-_]MX$/i.test(voice.lang) &&
              /paulina/i.test(voice.name)
          ) ??
          voices.find((voice) => /^es[-_]MX$/i.test(voice.lang)) ??
          voices.find((voice) => /^es([_-]|$)/i.test(voice.lang))
        )
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
    if (voice) utterance.voice = voice

    utterance.onstart = () =>
      setStatus(language === 'es' ? 'Sophia está hablando…' : 'Sophia is speaking…')

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
      .replace(/["'“”‘’.,!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Debugging logs for browser console (F12)
    console.log("--- SOPHIA COMMAND DEBUG ---")
    console.log("Raw input:", rawCommand)
    console.log("Normalized input:", normalized)
    console.log("Language mode:", language)

    const spanish = language === 'es'

    if (!text) {
      setStatus(spanish ? 'Escribe o di un comando primero.' : 'Please type or say a command first.')
      return
    }

    setCommand(text)

    // Stop speaking command
    if (/stop|quiet|silence|silencio|detener|deja/i.test(normalized)) {
      window.speechSynthesis?.cancel()
      setStatus(spanish ? 'Respuesta de voz detenida.' : 'Voice response stopped.')
      return
    }

    // Threat Analyzer (Matches "threat", "analizador", "amenazas")
    if (
      normalized.includes('threat') ||
      normalized.includes('analizador') ||
      normalized.includes('amenazas')
    ) {
      onNavigate('threat-analyzer')
      setStatus(spanish ? 'Abrí el analizador de amenazas.' : 'Opened the Threat Analyzer.')
      speak(spanish ? 'Abriendo el analizador de amenazas.' : 'Opening the Threat Analyzer.')
      return
    }

    // Security Checkup (Matches "security", "checkup", "checklist", "revision", "seguridad")
    if (
      normalized.includes('security') ||
      normalized.includes('checkup') ||
      normalized.includes('checklist') ||
      normalized.includes('revision') ||
      normalized.includes('seguridad')
    ) {
      onNavigate('security-checkup')
      setStatus(spanish ? 'Abrí la revisión de seguridad.' : 'Opened the Security Checkup.')
      speak(spanish ? 'Abriendo la revisión de seguridad.' : 'Opening the Security Checkup.')
      return
    }

    // Incident Response (Matches "incident", "response", "respuesta", "incidentes")
    if (
      normalized.includes('incident') ||
      normalized.includes('response') ||
      normalized.includes('respuesta') ||
      normalized.includes('incidentes')
    ) {
      onNavigate('incident-response')
      setStatus(spanish ? 'Abrí la respuesta a incidentes.' : 'Opened Incident Response.')
      speak(spanish ? 'Abriendo la respuesta a incidentes.' : 'Opening Incident Response.')
      return
    }

    // Overview / Home (Matches "overview", "inicio", "resumen")
    if (
      normalized.includes('overview') ||
      normalized.includes('inicio') ||
      normalized.includes('resumen')
    ) {
      onNavigate('overview')
      setStatus(spanish ? 'Abrí el resumen.' : 'Opened Overview.')
      speak(spanish ? 'Abriendo el resumen.' : 'Opening Overview.')
      return
    }

    // Email Analysis match (Matches "analyze", "check", "analiza", "revisa", etc.)
    const analysisMatch = text.match(
      /^(?:(?:please|por favor)\s+)?(?:analyze|analyse|check|inspect|analiza|analizar|revisa|revisar|verifica|verificar)\s+(?:(?:this|este|esta)\s+)?(?:email|e-mail|message|text|correo|mensaje|texto)?\s*[:-]?\s*([\s\S]+)$/i
    )

    if (analysisMatch?.[1]?.trim()) {
      const message = analysisMatch[1].trim()
      onSetMessage(message)
      onNavigate('threat-analyzer')
      onAnalyzeMessage(message)
      setStatus(
        spanish
          ? 'Revisé el mensaje con reglas locales de patrones de alerta.'
          : 'Checked the message using local warning-pattern rules.'
      )
      speak(
        spanish
          ? 'Revisé el mensaje con reglas locales de patrones de alerta.'
          : 'I checked the message using local warning-pattern rules.'
      )
      return
    }

    // Send unmatched commands to the AI chat handler.
    setStatus(spanish ? 'Consultando a Muse Spark…' : 'Asking Muse Spark…')
    void sendChatMessage(text)
    speak(spanish ? 'Déjame analizar eso.' : 'Let me analyze that for you.')
  }

  async function sendChatMessage(messageText = chatInput) {
    const message = messageText.trim()

    if (!message || chatBusy) return

    if (!supabase) {
      setChatReply('Supabase is not configured. Please check the app configuration.')
      return
    }

    setChatBusy(true)
    setChatReply('Sophia is thinking…')

    try {
      const { data, error } = await supabase.functions.invoke('sophia-chat', {
        body: {
          message,
          history: [],
        },
      })
      console.log('Sophia chat response:', { data, error })

      if (error) {
        throw error
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      if (typeof data?.reply !== 'string' || !data.reply.trim()) {
        throw new Error('Sophia returned an empty response.')
      }

      setChatReply(data.reply.trim())
      setChatInput('')
      speak(data.reply.trim())
    } catch (error) {
      console.error('Sophia chat failed:', error)
      setChatReply(
        'Sophia could not respond. Please sign in if needed, then try again.'
      )
    } finally {
      setChatBusy(false)
    }
  }

  function startListening() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }

    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setStatus(
        'Speech recognition is not supported in this browser. Type your command below instead.'
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
        if (transcript) processCommand(transcript)
      }

      recognition.onerror = () => {
        setStatus(
          'Microphone recognition failed. Check browser microphone permission or type a command.'
        )
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognitionRef.current = recognition
      setListening(true)
      setStatus('Listening… speak a ShieldPocket command.')
      recognition.start()
    } catch {
      setListening(false)
      setStatus(
        'Could not start the microphone. You can type a command instead.'
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
              ? 'Usa tu voz o escribe para navegar las herramientas de seguridad y revisar un mensaje.'
              : 'Use voice or text to navigate security tools and check a message.'}
          </p>
        </div>
        <span className="demo-tag">VOICE BETA</span>
      </div>

      <div className="voice-language-picker">
        <label htmlFor="sophia-language">{language === 'es' ? 'Idioma de Sophia' : "Sophia's language"}</label>
        <select id="sophia-language" value={language} onChange={(event) => setLanguage(event.target.value as 'es' | 'en')}>
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
          <strong>{listening ? (language === 'es' ? 'Escuchando…' : 'Listening now') : (language === 'es' ? 'Lista para ayudarte' : 'Ready to help')}</strong>
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
          onClick={startListening}
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
                ? 'Verificando huella / Passkey…'
                : 'Verifying fingerprint / Passkey…'
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
          🔒 {language === 'es' ? 'Escanear huella / Passkey' : 'Scan Fingerprint / Passkey'}
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
              <li>“Abre el analizador de amenazas”</li>
              <li>“Abre la revisión de seguridad”</li>
              <li>“Abre la respuesta a incidentes”</li>
              <li>“Analiza correo:”, seguido del mensaje que quieres revisar</li>
            </>
          ) : (
            <>
              <li>“Open threat analyzer”</li>
              <li>“Open security checkup”</li>
              <li>“Open incident response”</li>
              <li>“Analyze email:” followed by the message you want checked</li>
            </>
          )}
        </ul>
      </div>

      <div className="sophia-chat">
        <h3>{language === 'es' ? 'Habla con Sophia' : 'Chat with Sophia'}</h3>
        <p>
          {language === 'es'
            ? 'Haz preguntas sobre ciberseguridad en español o inglés.'
            : 'Ask cybersecurity questions in English or Spanish.'}
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

        <button
          type="button"
          onClick={() => void sendChatMessage()}
          disabled={chatBusy || !chatInput.trim()}
        >
          {chatBusy
            ? (language === 'es' ? 'Pensando…' : 'Thinking…')
            : (language === 'es' ? 'Enviar mensaje' : 'Send message')}
        </button>

        {chatReply && (
          <div className="sophia-chat-reply" role="status" aria-live="polite">
            <strong>{language === 'es' ? 'Sophia responde:' : 'Sophia says:'}</strong>
            <p>{chatReply}</p>
          </div>
        )}
      </div>

      <p className="disclaimer">
        {language === 'es'
          ? 'Versión beta de voz: los comandos solo controlan las herramientas que aparecen en ShieldPocket. Sophia no puede acceder a tu bandeja de entrada, iniciar sesión en otros sitios ni eludir la autenticación. La revisión de mensajes utiliza patrones locales; no está conectada a un modelo de inteligencia artificial.'
          : 'Voice beta: commands only control ShieldPocket’s on-screen tools. Sophia cannot access your inbox, sign in to other websites, or bypass authentication. Message checks use local pattern matching, not a connected AI model.'}
      </p>
    </section>
  )
}