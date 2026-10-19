import "@/features/landing/landing.css";
import { Hero } from "@/features/landing/Hero";
import { HeroCards } from "@/features/landing/HeroCards";
import { HeroNav } from "@/features/landing/HeroNav";
import { IntroSequence } from "@/features/landing/IntroSequence";
import { MyGroups } from "@/features/landing/MyGroups";
import { Grain } from "@/ui/Grain";

export default function LandingPage() {
  return (
    <div className="landing">
      <IntroSequence />

      {/* The Ink square of the mark opens into this stage. */}
      <div className="landing-stage">
        <div className="landing-glow" aria-hidden="true">
          <div className="orb orb-mint" />
          <div className="orb orb-coral" />
          <Grain id="stage-grain" />
        </div>

        <div className="flex min-h-dvh flex-col">
          <HeroNav />

          <main
            id="top"
            className="relative z-10 mx-auto box-border flex w-full max-w-[1200px] flex-1 flex-wrap items-center gap-14 px-6 pt-10 pb-6"
          >
            <Hero />
            <HeroCards />
          </main>

          <a
            href="#how"
            className="m-fade-up after relative z-10 flex flex-col items-center gap-2.5 self-center px-4 pt-3 pb-8 text-[13px] font-semibold text-paper no-underline"
            style={{ ["--d" as string]: "1.9s" }}
          >
            Scroll to discover
            <span className="m-pulse size-[22px] rounded-full bg-mint" />
          </a>
        </div>

        <MyGroups />
      </div>
    </div>
  );
}
