import { Mark } from "@/ui/brand/Mark";
import { Grain } from "@/ui/Grain";

/** Plays once per browser session and is skipped with reduced motion. */
const SKIP_SCRIPT = `try{var k='parity_intro_seen';if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.intro='skip'}else{sessionStorage.setItem(k,'1')}}catch(e){}`;

/** 0–2.6 s: paper, the mark grows from a dot, P A R I T Y fades in, the bars level out. */
export function IntroSequence() {
  return (
    <>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }}
      />
      <Grain id="paper-grain" opacity={0.35} blend="multiply" frequency={0.85} />
      <div className="intro" aria-hidden="true">
        <Mark size={80} className="intro-mark" barClassNames={["intro-bar-a", "intro-bar-b"]} />
        <div className="intro-word">
          {"PARITY".split("").map((letter, i) => (
            <span
              key={letter + i}
              className="intro-letter"
              style={{ animationDelay: `${0.35 + i * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
