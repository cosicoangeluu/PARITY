import { creatorPayDetails, type GroupContext } from "@/server/access";
import { SectionTitle } from "@/ui/Screen";
import { PayDetailsForm } from "../people/PeopleForms";

export async function PaymentSettings({ ctx }: { ctx: GroupContext }) {
  if (!ctx.isOrganizer) return null;
  const details = await creatorPayDetails(ctx);
  return (
    <>
      <SectionTitle>Receiving payment details</SectionTitle>
      <PayDetailsForm
        token={ctx.group.token}
        gcash={details.gcash}
        maya={details.maya}
        qrUrl={details.qrUrl}
      />
    </>
  );
}
