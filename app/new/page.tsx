import { CreateGroupForm } from "@/features/groups/CreateGroupForm";
import { AppStage } from "@/ui/AppStage";
import { Lockup } from "@/ui/brand/Wordmark";
import { ScreenTitle } from "@/ui/Screen";

export const metadata = { title: "Start a group" };

export default function NewGroupPage() {
  return (
    <AppStage>
      <header className="mx-auto flex w-full max-w-[720px] items-center px-4 pt-4 sm:px-6">
        <Lockup tone="light" />
      </header>
      <main className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-20 sm:px-6">
        <ScreenTitle eyebrow="New Group" title="Start a group">
          No sign-up. You'll get a link to share with everyone.
        </ScreenTitle>
        <CreateGroupForm />
      </main>
    </AppStage>
  );
}
