// The final message. Fades in line by line, slowly, like the words at the very start.
// Each part starts `delay` seconds after the screen appears. Edit the wording or timings here.
const PARTS = [
  { text: 'Happy birthday Sonia,', delay: 2, className: 'birthday__greeting' },
  {
    text: 'This is something small but I wanted to make something for you. You are truly an amazing person and deserve the world. Thank you for more than a year of good times.',
    delay: 5.5,
  },
  {
    text: "But to be honest, I've never met someone with such a Golden Heart like yours, you truly care for people and that really says a lot.",
    delay: 12,
  },
  { text: 'Thank you for being you and I hope you have an amazing day Wizer', delay: 18 },
]

export default function Birthday() {
  return (
    <div className="birthday">
      {PARTS.map((part) => (
        <p
          key={part.delay}
          className={part.className ?? 'birthday__text'}
          style={{ animationDelay: `${part.delay}s` }}
        >
          {part.text}
        </p>
      ))}
    </div>
  )
}
