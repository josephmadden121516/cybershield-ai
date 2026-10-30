import { useState } from 'react'
import {
  requestPhishingGamePack,
  type PhishGamePack,
} from '../lib/securityAdvisors'
import './PhishingGame.css'

const ROUNDS_PER_GAME = 5

interface PhishingGameProps {
  language: 'en' | 'es'
}

type GamePhase = 'idle' | 'loading' | 'answering' | 'revealed' | 'done'

export function PhishingGame({ language }: PhishingGameProps) {
  const isEs = language === 'es'
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [pack, setPack] = useState<PhishGamePack | null>(null)
  const [roundIndex, setRoundIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const round = pack?.rounds[roundIndex] ?? null
  const score = answers.filter(Boolean).length

  async function startGame() {
    setPhase('loading')
    setErrorMessage('')
    setPack(null)
    setRoundIndex(0)
    setAnswers([])
    try {
      const gamePack = await requestPhishingGamePack(language, ROUNDS_PER_GAME)
      setPack(gamePack)
      setPhase('answering')
    } catch (error) {
      console.error('Could not start the phishing game.', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEs
            ? 'No se pudo iniciar el juego.'
            : 'Could not start the game.'
      )
      setPhase('idle')
    }
  }

  function answer(saidPhish: boolean) {
    if (phase !== 'answering' || !round) return
    setAnswers((previous) => [...previous, saidPhish === round.isPhish])
    setPhase('revealed')
  }

  function nextRound() {
    if (!pack) return
    if (roundIndex + 1 >= pack.rounds.length) {
      setPhase('done')
    } else {
      setRoundIndex(roundIndex + 1)
      setPhase('answering')
    }
  }

  function grade(): string {
    if (!pack) return ''
    const ratio = score / pack.rounds.length
    if (ratio >= 1) return isEs ? 'Ojo de águila: puntaje perfecto.' : 'Eagle eye: a perfect score.'
    if (ratio >= 0.8) return isEs ? 'Muy alerta: casi perfecto.' : 'Sharp instincts: nearly perfect.'
    if (ratio >= 0.6) return isEs ? 'Buen comienzo: sigue practicando.' : 'Good start: keep practicing.'
    return isEs
      ? 'La práctica hace al experto: juega otra ronda.'
      : 'Training pays off: play another round.'
  }

  const lastCorrect = answers.length > 0 ? answers[answers.length - 1] : false

  return (
    <section
      id="phishing-game"
      className="content-card phishing-game"
      aria-labelledby="phishing-game-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="phishing-game-title">
            {isEs ? 'Juego: ¿real o trampa?' : 'Spot the phish game'}
          </h2>
          <p>
            {isEs
              ? 'La IA genera correos nuevos en cada partida: decide cuáles son trampas.'
              : 'AI deals a fresh hand of emails every game: call out the phish.'}
          </p>
        </div>
        <span className="demo-tag">{isEs ? 'JUEGO IA' : 'AI GAME'}</span>
      </div>

      {phase === 'idle' && (
        <div className="phishing-game-start">
          <p>
            {isEs
              ? `${ROUNDS_PER_GAME} correos por partida, mezcla de trampas y mensajes legítimos. Cada partida nueva cuesta una llamada de IA (unos centavos).`
              : `${ROUNDS_PER_GAME} emails per game, a mix of phish and legitimate mail. Each new game costs one AI call (a few cents).`}
          </p>
          <button type="button" className="primary-button" onClick={() => void startGame()}>
            {isEs ? 'Repartir correos' : 'Deal the emails'}
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <p className="phishing-game-status" role="status">
          {isEs ? 'La IA está escribiendo tus correos…' : 'AI is writing your emails…'}
        </p>
      )}

      {errorMessage && (
        <p className="phishing-game-error" role="alert">
          {errorMessage}
        </p>
      )}

      {(phase === 'answering' || phase === 'revealed') && round && pack && (
        <div className="phishing-game-round">
          <p className="phishing-game-progress">
            {isEs ? 'Correo' : 'Email'} {roundIndex + 1} / {pack.rounds.length}
            <span className="phishing-game-score">
              {isEs ? 'Aciertos' : 'Correct'}: {score}
            </span>
          </p>
          <article className="phishing-game-email" aria-label={isEs ? 'Correo del juego' : 'Game email'}>
            <p className="phishing-game-field">
              <span>{isEs ? 'De' : 'From'}:</span> {round.sender}
            </p>
            <p className="phishing-game-field">
              <span>{isEs ? 'Asunto' : 'Subject'}:</span> {round.subject}
            </p>
            <p className="phishing-game-body">{round.body}</p>
          </article>

          {phase === 'answering' ? (
            <div className="phishing-game-vote">
              <button type="button" className="primary-button" onClick={() => answer(false)}>
                {isEs ? 'Legítimo' : 'Legitimate'}
              </button>
              <button type="button" className="secondary-button" onClick={() => answer(true)}>
                {isEs ? 'Trampa' : 'Phish'}
              </button>
            </div>
          ) : (
            <div className="phishing-game-reveal" role="status" aria-live="polite">
              <p className={lastCorrect ? 'phishing-game-right' : 'phishing-game-wrong'}>
                {lastCorrect
                  ? isEs
                    ? 'Correcto.'
                    : 'Correct.'
                  : isEs
                    ? `Incorrecto: era ${round.isPhish ? 'trampa' : 'legítimo'}.`
                    : `Missed: that was ${round.isPhish ? 'phish' : 'legitimate'}.`}
              </p>
              <p>{round.verdict}</p>
              {round.redFlags.length > 0 && (
                <ul>
                  {round.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="primary-button" onClick={nextRound}>
                {roundIndex + 1 >= pack.rounds.length
                  ? isEs
                    ? 'Ver resultado'
                    : 'See score'
                  : isEs
                    ? 'Siguiente correo'
                    : 'Next email'}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && pack && (
        <div className="phishing-game-final" role="status" aria-live="polite">
          <p className="phishing-game-final-score">
            {score} / {pack.rounds.length}
          </p>
          <p>{grade()}</p>
          <button type="button" className="primary-button" onClick={() => void startGame()}>
            {isEs ? 'Jugar otra vez' : 'Play again'}
          </button>
        </div>
      )}

      <p className="phishing-game-disclaimer">
        {isEs
          ? 'Simulación de entrenamiento con remitentes y dominios ficticios. Al repartir, la solicitud usa créditos de API. Sirve para practicar; ante un correo real sospechoso, verifícalo por un canal independiente.'
          : 'Training simulation with fictional senders and domains. Dealing a game uses API credits. Practice here; verify any real suspicious email through an independent channel.'}
      </p>
    </section>
  )
}
