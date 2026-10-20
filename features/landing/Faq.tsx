import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/ui/Icon";

interface Question {
  q: string;
  a: ReactNode;
}

interface Topic {
  id: string;
  title: string;
  intro: string;
  questions: Question[];
}

/** Plain-language answers for first-time users. Keep every answer true to how the app works. */
const TOPICS: Topic[] = [
  {
    id: "how",
    title: "The basics",
    intro: "What Parity is and what it does for you.",
    questions: [
      {
        q: "What is Parity, in simple words?",
        a: (
          <>
            <p>
              Parity is a free website that helps a group of friends, family or officemates share
              costs fairly. Think of it as a shared notebook where everyone writes down who paid for
              what. Parity then does the math and tells each person exactly how much they owe, and
              to whom.
            </p>
            <p>
              Example: Ana paid for dinner, Ben paid for the Grab ride, and Carlo paid for
              halo-halo. Instead of everyone computing on a calculator, Parity shows you something
              like <strong>"Carlo pays Ana ₱180.00"</strong> and you're done.
            </p>
          </>
        ),
      },
      {
        q: "Do I need to make an account or download an app?",
        a: (
          <>
            <p>
              No. There's no sign-up, no password and nothing to install. Parity opens in the
              browser you already use on your phone or computer (Chrome, Safari and so on).
            </p>
            <p>
              Instead of an account, each Group has its own private link. Whoever has the link can
              open the Group. You just tap your name once, and your phone remembers you.
            </p>
          </>
        ),
      },
      {
        q: "Is it really free? Are there hidden charges?",
        a: (
          <p>
            Yes, it's completely free. There are no ads, no subscriptions and no fees, and Parity
            never takes a cut of your money. Parity doesn't hold or send money at all. You still pay
            each other the usual way, through GCash, Maya, your bank or cash.
          </p>
        ),
      },
      {
        q: "How does it work, step by step?",
        a: (
          <ol>
            <li>
              <strong>Start a Group.</strong> Give it a name like "Baguio barkada trip" and type
              everyone's names.
            </li>
            <li>
              <strong>Share the link.</strong> Send it to your group chat on Messenger, Viber or
              wherever you talk.
            </li>
            <li>
              <strong>Add what each person paid.</strong> Type it in, or take a photo of the receipt
              and let everyone tick what they ate.
            </li>
            <li>
              <strong>See who owes whom.</strong> Parity shows the fewest payments needed to make
              everyone even.
            </li>
            <li>
              <strong>Pay and confirm.</strong> Pay through GCash, Maya, bank or cash, tap "I paid",
              and the person who got the money confirms it.
            </li>
          </ol>
        ),
      },
      {
        q: "What can I use it for?",
        a: (
          <p>
            Anything where people take turns paying: barkada trips, food trips, a shared apartment's
            rent and bills, office lunches, birthday treats, grocery runs, a family reunion, or one
            restaurant bill you want to split by what each person ordered.
          </p>
        ),
      },
    ],
  },
  {
    id: "groups",
    title: "Starting and joining a Group",
    intro: "Getting everyone in, and making sure nobody can pretend to be you.",
    questions: [
      {
        q: "How do I start a Group?",
        a: (
          <>
            <p>
              Tap <strong>Start a group</strong> at the top of this page. Type a name for the Group,
              your own name, and the names of the people joining you. Pick the currency (Philippine
              peso is the default; you can also choose US dollar, Japanese yen, Korean won or
              Singapore dollar for trips abroad). Then tap <strong>Create Group</strong>.
            </p>
            <p>
              Forgot someone? No problem. You can add or remove people later, and others can also
              join using the link.
            </p>
          </>
        ),
      },
      {
        q: "How do my friends join?",
        a: (
          <p>
            Copy the Group link and send it to them. When they open it, Parity asks{" "}
            <strong>"Who are you?"</strong> and shows the list of names. They tap their own name,
            and that's it. No sign-up needed on their side either.
          </p>
        ),
      },
      {
        q: 'Why does Parity ask "Who are you?" only once?',
        a: (
          <>
            <p>
              The first phone to tap a name gets tied to that name. We call this the{" "}
              <strong>name lock</strong>. After that, nobody else's phone can act as you. If someone
              else opens the link and tries to tap your name, they'll see "Used on another device".
            </p>
            <p>This keeps things honest: only you can say "I paid" in your name.</p>
          </>
        ),
      },
      {
        q: "My name isn't on the list. What do I do?",
        a: (
          <p>
            Tap <strong>I'm not listed</strong> and type your name. The organizer (the person who
            made the Group) will see your request and approve it. Until then, you'll see "Waiting
            for approval".
          </p>
        ),
      },
      {
        q: "I changed phones, cleared my browser, or tapped the wrong name. Help!",
        a: (
          <p>
            Ask the organizer to <strong>reset your name</strong> from the People screen. Once
            reset, you can open the link on your new phone and tap your name again. Nothing you
            added is lost; your expenses and payments stay in the Group.
          </p>
        ),
      },
      {
        q: 'What is "Your groups on this device"?',
        a: (
          <>
            <p>
              Since there are no accounts, your phone keeps a list of the Groups you've opened. It
              appears on this page so you can jump back in without searching your chats for the
              link.
            </p>
            <p>
              Getting a new phone? Tap <strong>Back up my links</strong> to save a small file, then
              tap <strong>Restore</strong> on the new phone and choose that file.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "expenses",
    title: "Adding expenses",
    intro: "Writing down who paid, and splitting it the way your group wants.",
    questions: [
      {
        q: "How do I add an expense?",
        a: (
          <>
            <p>Inside your Group, tap the button to add an entry, then fill in:</p>
            <ul>
              <li>
                <strong>What for?</strong> For example, "Dinner at Mang Inasal".
              </li>
              <li>
                <strong>How much?</strong> The total amount paid.
              </li>
              <li>
                <strong>Who paid?</strong> The person who took out their wallet.
              </li>
              <li>
                <strong>Split between whom?</strong> Everyone is ticked by default. Untick anyone
                who wasn't part of it.
              </li>
            </ul>
            <p>Parity shows each person's part before you save, so you can double-check.</p>
          </>
        ),
      },
      {
        q: "What do Equally, By shares, By % and Fixed amounts mean?",
        a: (
          <>
            <p>These are the different ways to divide one expense. Say the bill is ₱1,000:</p>
            <ul>
              <li>
                <strong>Equally:</strong> everyone pays the same. Four people pay ₱250.00 each.
              </li>
              <li>
                <strong>By shares:</strong> some people count as more than one. If Ana brought her
                child and counts as 2 shares while Ben and Carlo count as 1 each, that's 4 shares:
                Ana pays ₱500.00, Ben and Carlo pay ₱250.00 each.
              </li>
              <li>
                <strong>By %:</strong> you set a percentage for each person, and it must add up to
                100%. For example, 50% / 30% / 20% means ₱500.00 / ₱300.00 / ₱200.00.
              </li>
              <li>
                <strong>Fixed amounts:</strong> you type exactly how much each person owes. The
                amounts must add up to the full bill.
              </li>
            </ul>
            <p>
              If a person always counts as more (like a family of three in a barkada trip), the
              organizer can set a <strong>default share</strong> for them on the People screen, so
              you don't have to change it every time.
            </p>
          </>
        ),
      },
      {
        q: "What are Transfer and Income?",
        a: (
          <ul>
            <li>
              <strong>Expense:</strong> someone paid for the group (food, gas, hotel).
            </li>
            <li>
              <strong>Transfer:</strong> money that went straight from one person to another, like
              Ben lending Ana ₱500 in cash. This isn't shared; it only affects those two people.
            </li>
            <li>
              <strong>Income:</strong> money the group received, like a returned deposit from the
              resort. Parity divides it back to everyone, so it lowers what people owe.
            </li>
          </ul>
        ),
      },
      {
        q: "Can I add many expenses at once?",
        a: (
          <p>
            Yes. If you saved up receipts during a trip, use the option to add several entries in
            one go. Each one is split equally among the same people. You can still open any of them
            later and change the split.
          </p>
        ),
      },
      {
        q: "I made a mistake. Can I fix or delete an entry?",
        a: (
          <p>
            Yes. Open the entry to edit it, or delete it. Deleted entries go to the{" "}
            <strong>Trash</strong> for 30 days, so you can bring them back if you change your mind.
            Every change is also written in the <strong>Activity</strong> list, so the whole group
            can see who added, changed or deleted what. No secret edits.
          </p>
        ),
      },
      {
        q: "₱100 split three ways doesn't divide evenly. What happens to the extra centavo?",
        a: (
          <p>
            Parity never loses or invents a single centavo. ₱100 split three ways becomes ₱33.33,
            ₱33.33 and ₱33.34. The extra centavo goes to the person who paid, so the parts always
            add up exactly to the real bill.
          </p>
        ),
      },
    ],
  },
  {
    id: "scan",
    title: "Scan & Split (receipt photos)",
    intro: "Take a photo of the receipt and let everyone tick what they had.",
    questions: [
      {
        q: "What is Scan & Split?",
        a: (
          <>
            <p>
              It's the easiest way to split a restaurant or grocery bill by what each person
              actually ordered. You take a photo of the receipt, Parity reads the items and prices,
              and you send one link to everyone. Each person opens it and ticks what they had, like
              "1 sisig" or "2 rice". Parity computes everyone's part, including their share of the
              service charge.
            </p>
            <p>
              You can use it inside a Group, or on its own with <strong>Scan a receipt</strong> on
              this page, with no Group needed.
            </p>
          </>
        ),
      },
      {
        q: "How do I take a good photo of the receipt?",
        a: (
          <ul>
            <li>Lay the receipt flat in good light and avoid shadows.</li>
            <li>Make sure the words are sharp and readable before you take the photo.</li>
            <li>
              <strong>Long receipt?</strong> Take it in parts, top to bottom, up to 6 photos. Let
              each photo overlap the previous one a little. Parity joins them and removes the
              repeated lines.
            </li>
            <li>You can also choose photos you already took from your gallery.</li>
          </ul>
        ),
      },
      {
        q: "What if Parity reads the receipt wrong?",
        a: (
          <>
            <p>
              Always check the list before sharing it. On the <strong>Check the items</strong>{" "}
              screen you can fix names, quantities and prices, remove lines, or add missing ones.
              Lines Parity isn't sure about are marked <strong>Please check</strong>.
            </p>
            <p>
              Type the <strong>receipt total</strong> too. If the items don't add up to it, Parity
              tells you how much is missing or extra, and which photo to retake. If a receipt is too
              faded, tap <strong>Type items instead</strong> and enter them by hand.
            </p>
          </>
        ),
      },
      {
        q: "How do people say what they ate?",
        a: (
          <>
            <p>
              Each person opens the bill link, picks their name, and ticks the items they had. For
              items with more than one piece (like 3 orders of rice), they choose how many were
              theirs.
            </p>
            <ul>
              <li>
                If two people tick the same single item (say, one big pitcher of iced tea), they
                split its price equally.
              </li>
              <li>
                Items like a shared platter can be marked <strong>Shared by everyone</strong>, so
                nobody needs to tick them.
              </li>
              <li>
                Everyone sees the claims update live, along with how many items are still unclaimed.
              </li>
            </ul>
          </>
        ),
      },
      {
        q: "How are service charge, delivery fee and discounts divided?",
        a: (
          <>
            <p>
              They're shared in proportion to what each person had. If you ordered ₱600 of the
              ₱1,200 food, you pay half of the service charge. Someone who only had a ₱100 drink
              pays a much smaller part. That's fairer than dividing it equally.
            </p>
            <p>
              <strong>Senior citizen or PWD discount?</strong> The person who made the bill can add
              it to that specific person only, so the discount goes to the person who's entitled to
              it.
            </p>
          </>
        ),
      },
      {
        q: "What if nobody claims an item?",
        a: (
          <p>
            Leftover items are shown as <strong>Unclaimed</strong>. The person who made the bill can
            assign them to someone, or split them among everyone. Once every item has an owner, they
            tap <strong>Finalize</strong>. Inside a Group, the finished bill is added to the Group's
            expenses automatically. If something was wrong, the bill can be reopened as long as no
            one has marked a payment yet.
          </p>
        ),
      },
      {
        q: "Who sees my receipt photo?",
        a: (
          <p>
            Only people with the bill link. To read the text, receipts are sent to Google's free
            Gemini service, which may use them to improve its models, so avoid photographing
            anything private like card numbers or addresses. Receipt photos are deleted once the
            bill is fully paid.
          </p>
        ),
      },
    ],
  },
  {
    id: "pay",
    title: "Settling up and payments",
    intro: "Who pays whom, and how everyone knows the money arrived.",
    questions: [
      {
        q: "How does Parity decide who pays whom?",
        a: (
          <>
            <p>
              Parity looks at everything everyone paid and everything they owe, then finds the{" "}
              <strong>fewest payments</strong> needed to make everyone even. You'll see it on the{" "}
              <strong>Settle</strong> screen as simple lines like "Ben pays Ana ₱286.67".
            </p>
            <p>
              Example: on a trip, Ana paid the ₱3,000 hotel, Ben paid ₱1,500 for food, and Carlo
              paid nothing. That's ₱4,500 total, or ₱1,500 each. Ben already paid his part, so
              instead of a confusing chain of payments, Parity just says{" "}
              <strong>"Carlo pays Ana ₱1,500.00"</strong>. One payment, done.
            </p>
          </>
        ),
      },
      {
        q: "Does Parity send the money for me?",
        a: (
          <p>
            No. Parity only keeps track. You send money the way you always do: through your GCash or
            Maya app, a bank transfer or InstaPay, or cash in person. Then you come back to Parity
            and tap <strong>I paid</strong> so everyone knows.
          </p>
        ),
      },
      {
        q: "How do I mark that I paid?",
        a: (
          <>
            <ol>
              <li>Send the money using your GCash, Maya, bank or cash.</li>
              <li>
                In Parity, tap <strong>I paid</strong>, choose how you paid, and check the amount.
              </li>
              <li>
                For GCash, Maya and bank, type the <strong>reference number</strong>. You'll find it
                on the confirmation screen right after sending, or in your app's transaction
                history. You can also attach a screenshot as proof.
              </li>
            </ol>
            <p>
              Your payment shows as <strong>Pending</strong> until the person you paid confirms it.
            </p>
          </>
        ),
      },
      {
        q: "Why does the other person have to confirm?",
        a: (
          <>
            <p>
              Parity can't see inside your GCash or bank, so it can't check payments by itself.
              Instead, the person who received the money checks their own app, finds the matching
              reference number, and taps <strong>Confirm</strong>. Only then is it marked{" "}
              <strong>Paid</strong>.
            </p>
            <p>
              If they can't find it, they can <strong>Reject</strong> it with a reason, like "wrong
              amount", so you can sort it out and try again.
            </p>
          </>
        ),
      },
      {
        q: "What if the person never confirms?",
        a: (
          <p>
            Remind them first, since they may just have missed it. If 7 days pass and it still isn't
            confirmed, the organizer can step in and confirm it for them.
          </p>
        ),
      },
      {
        q: "How do others know my GCash or Maya number?",
        a: (
          <p>
            Add your numbers on the <strong>People</strong> screen under "Your GCash and Maya". When
            someone needs to pay you, Parity shows your number with a <strong>Copy number</strong>{" "}
            button, so they don't have to ask in the chat. Only add them if you're comfortable
            sharing them with people who have the Group link.
          </p>
        ),
      },
      {
        q: "How do I know when everything is paid?",
        a: (
          <p>
            When every payment is confirmed, the Settle screen shows{" "}
            <strong>Everyone's settled</strong>, and a scanned bill shows{" "}
            <strong>Fully paid</strong>. If you need a record, anyone in the Group can tap{" "}
            <strong>Export to Excel</strong> to download every entry as a spreadsheet.
          </p>
        ),
      },
    ],
  },
  {
    id: "safety",
    title: "Organizer, privacy and safety",
    intro: "Keeping your Group safe without passwords.",
    questions: [
      {
        q: "What is the organizer?",
        a: (
          <p>
            The organizer is the person who made the Group. Their phone gets extra tools: approving
            new people, resetting someone's name, setting default shares, replacing the link and
            locking the Group. Everyone else can still add expenses and record payments.
          </p>
        ),
      },
      {
        q: "I'm the organizer and I'm getting a new phone. Will I lose my organizer tools?",
        a: (
          <p>
            Not if you save your <strong>backup organizer link</strong> first. You'll find it on the
            People screen. Keep it somewhere private, like your own notes or a message to yourself,
            and open it on your new phone to get organizer access back. Never share it with anyone
            else.
          </p>
        ),
      },
      {
        q: "Who can see my Group?",
        a: (
          <p>
            Only people who have the link. It's a long, random link that's practically impossible to
            guess. Treat it like a house key: share it with your group chat, but don't post it
            publicly on Facebook or anywhere strangers can see it.
          </p>
        ),
      },
      {
        q: "The link got shared with someone it shouldn't have. What now?",
        a: (
          <p>
            The organizer can <strong>replace the link</strong> on the People screen. The old link
            stops working right away, and you share the new one with your group. Nothing in the
            Group is lost.
          </p>
        ),
      },
      {
        q: 'What does "Lock the Group" do?',
        a: (
          <p>
            Locking freezes the Group, which is useful when a trip is over and everything is
            settled. Nobody can add, change or delete expenses, and no new people can ask to join.
            Everyone can still view it. The organizer can unlock it anytime.
          </p>
        ),
      },
      {
        q: "What information does Parity keep about me?",
        a: (
          <p>
            Only what your group types in: names, expenses, payments and, if you add them, your
            GCash or Maya numbers. There's no email, no password and no phone contacts. Payment
            screenshots are deleted 30 days after the payment is confirmed or rejected, and receipt
            photos are deleted once the bill is fully paid.
          </p>
        ),
      },
    ],
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative z-10 mx-auto box-border flex w-full max-w-[1200px] flex-col gap-8 px-6 pb-24 max-[399px]:px-4"
    >
      <div className="flex max-w-[640px] flex-col gap-3">
        <h2
          id="faq-title"
          className="display m-0 text-paper"
          style={{ fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 600, lineHeight: 1.1 }}
        >
          Questions, answered
        </h2>
        <p className="m-0 text-lg leading-[1.55] text-muted-dark">
          New to Parity? Start here. Everything is explained in plain words, with real examples. Tap
          a question to see the answer.
        </p>
      </div>

      <nav aria-label="FAQ topics" className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="chip-glass m-lift min-h-11 no-underline">
            {t.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-10">
        {TOPICS.map((topic) => (
          <div key={topic.id} id={topic.id} className="faq-topic flex flex-col gap-4">
            <div>
              <h3 className="display m-0 text-[22px] font-bold text-paper">{topic.title}</h3>
              <p className="m-0 mt-1 text-[15px] text-muted-dark">{topic.intro}</p>
            </div>
            <div className="card flex flex-col p-2 sm:p-3">
              {topic.questions.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary className="faq-question">
                    <span>{item.q}</span>
                    <span className="faq-toggle" aria-hidden="true">
                      <Icon name="plus" size={16} strokeWidth={2.4} />
                    </span>
                  </summary>
                  <div className="faq-answer">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="display m-0 text-[22px] font-bold">Ready to try it?</p>
          <p className="m-0 mt-1 text-[15px] text-muted-dark">
            It takes about a minute, and it's free.
          </p>
        </div>
        <Link href="/new" className="m-lift inline-flex items-center gap-1.5 no-underline">
          <span className="flex min-h-11 items-center rounded-full bg-paper px-[18px] text-sm font-semibold text-ink">
            Start a group
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-mint text-ink">
            <Icon name="arrow" size={16} strokeWidth={2.4} />
          </span>
        </Link>
      </div>
    </section>
  );
}
