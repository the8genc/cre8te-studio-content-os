/**
 * Mock Anthropic client for Phase 2 offline development.
 * Returns realistic fixture responses without hitting the API.
 * Activated when ANTHROPIC_API_KEY is not set or MOCK_MODE=true.
 */

export async function claudeComplete(
  system: string,
  user:    string,
  _maxTokens = 2000
): Promise<string> {
  console.log(`  [MockAnthropic] claudeComplete called (${user.length} char prompt)`);
  await new Promise(r => setTimeout(r, 200)); // simulate latency

  // Route to appropriate fixture based on prompt content
  // ORDER MATTERS: more specific checks first

  // 1. Content package — system says "content writer" OR user has ANGLE: section
  if (system.toLowerCase().includes('content writer') ||
      user.includes('ANGLE:\n') ||
      user.includes('instagram_script')) {
    return JSON.stringify(FIXTURE_PACKAGE);
  }

  // 2. Content angles — extract/strategist prompts
  if (user.includes('Extract') ||
      user.includes('content angles') ||
      (user.includes('angle') && user.includes('TRANSCRIPT'))) {
    return JSON.stringify(FIXTURE_ANGLES);
  }

  // 3. Newsletter assembly
  if (user.toLowerCase().includes('newsletter') ||
      user.toLowerCase().includes('digest') ||
      user.includes('Write newsletter')) {
    return JSON.stringify(FIXTURE_NEWSLETTER);
  }

  // 4. Research scoring
  if (user.includes('Score') || user.includes('relevance') || user.includes('ITEMS')) {
    return JSON.stringify(FIXTURE_SCORES);
  }

    return JSON.stringify({ result: 'mock response', prompt_preview: user.slice(0, 100) });
}

export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  return JSON.parse(cleaned) as T;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURE_ANGLES = [
  {
    angle_title:    '47 followers, $80K contract — Maya Chen\'s Clarity Before Reach principle',
    angle_desc:     'Maya landed an $80K client from a post with 11 likes. The client chose her because she understood their problem better than anyone. This reframes what success looks like for creators at any audience size.',
    best_platforms: ['LinkedIn', 'Instagram', 'Newsletter'],
    content_type:   'Story',
    source_quote:   'I had 47 followers on LinkedIn. And I landed a $80,000 contract from a post that got eleven likes. Eleven.',
  },
  {
    angle_title:    'The 3-question framework that replaces your content strategy',
    angle_desc:     'Maya\'s Clarity Before Reach framework is built on three diagnostic questions any creator can answer today. The framework is specific, memorable, and immediately actionable — perfect for a carousel or LinkedIn post.',
    best_platforms: ['LinkedIn', 'Instagram', 'TikTok'],
    content_type:   'Carousel',
    source_quote:   'Who loses sleep over the problem you solve? What does the world look like the morning after? Why are you the only person who can tell them this right now?',
  },
  {
    angle_title:    'Slow is not the same as stuck — the creator timeline lie we believe',
    angle_desc:     'Maya\'s closing insight challenges the overnight success narrative directly. This speaks to the silent frustration of creators who are doing the work but not yet seeing the explosion they expected.',
    best_platforms: ['Instagram', 'TikTok', 'Facebook'],
    content_type:   'Quote',
    source_quote:   'Slow is not the same as stuck. We live in a culture that conflates speed with success.',
  },
  {
    angle_title:    '800 followers, booked 3 months out — what community-first actually looks like',
    angle_desc:     'The story of Maya\'s client with 800 followers who books out months in advance is the most concrete proof point for community-first strategy. It makes the abstract tangible and gives creators with small audiences real hope.',
    best_platforms: ['LinkedIn', 'Instagram', 'Newsletter'],
    content_type:   'Story',
    source_quote:   'I have a client who has 800 followers and books out three months in advance. Because those 800 people evangelize for her.',
  },
  {
    angle_title:    'You cannot amplify what you haven\'t clarified — the reach trap',
    angle_desc:     'This one-line principle from Maya is the core of her framework and immediately quotable. Works well as a standalone quote graphic, or as the hook for a longer breakdown of why most creator content doesn\'t convert.',
    best_platforms: ['Instagram', 'TikTok', 'LinkedIn'],
    content_type:   'Quote',
    source_quote:   'You cannot amplify what you haven\'t clarified. Most creators are trying to reach more people with a message that isn\'t even working for the people they already have.',
  },
];

const FIXTURE_PACKAGE = {
  package_title: 'Maya Chen — 47 Followers $80K Contract — Story Package',
  instagram_script: `She had 47 followers. She landed an $80,000 contract.

Maya Chen didn't go viral. She got clear.

Her client told her: "You understood our problem better than anyone who pitched us."

Not followers. Not reach. Clarity.

The framework she used → Clarity Before Reach:
→ Who loses sleep over the problem you solve?
→ What does their world look like after you solve it?
→ Why can only YOU tell them this, right now?

When you can answer all three in one sentence, you're ready to reach.

Until then, more reach just means more noise.

Tag a creator who needs to hear this. 👇

#creatorseconomy #personalbranding #contentcreator #cre8tecommunity #claritybeforereach`,

  youtube_script: `TITLE: She Had 47 Followers and Landed an $80K Deal (Here's How)

DESCRIPTION:
Maya Chen built a 7-figure creative agency without a single paid ad — starting with just 47 LinkedIn followers. In this session from the Cre8te Summit, she breaks down the Clarity Before Reach principle that changed everything.

The 3 questions you need to answer before you worry about reach, why community beats followers every time, and the mindset shift that separates creators who convert from those who just accumulate.

Watch until the end for the one thing Maya wishes someone told her at the start.

TAGS: creator economy, personal branding, content creator tips, clarity before reach, small audience big results, community first, cre8te studio, creative business`,

  linkedin_post: `47 followers. $80,000 contract.

Maya Chen wasn't going viral when she landed it. She had eleven likes on the post.

The client told her: "You understood our problem better than anyone who pitched us."

Here's the framework she used — she calls it Clarity Before Reach:

1. Who loses sleep over the problem you solve? (Not who finds it interesting — who loses sleep.)
2. What does their world look like the morning after you solve it? (The feeling, not the features.)
3. Why are you the only person who can tell them this, right now, in this way?

When you can answer all three in one sentence — you're ready to reach.

Until then, more followers just means more noise reaching the wrong people.

Most of us are trying to amplify a message that isn't even working for the audience we already have.

Slow down. Get clear. Then reach.

What's the one thing your ideal client loses sleep over?

#creatoreconomy #personalbranding #b2bmarketing`,

  tiktok_script: `HOOK (0-2s): She had 47 followers and landed an 80 thousand dollar contract

SCRIPT:
- Maya Chen built a 7-figure agency with no ads and no viral moment
- The client picked her because she understood their problem better than anyone
- Her framework: Clarity Before Reach
- 3 questions: who loses sleep, what does after look like, why only you
- One sentence answers all three = you're ready to reach
- Until then more reach = more noise

CAPTION: 47 followers → $80K contract 👀 this is what community-first actually looks like #creatortips #contentcreator #creatoreconomy`,

  facebook_post: `Real talk from the Cre8te Summit this week 👇

Maya Chen had 47 followers on LinkedIn when she landed an $80,000 contract.

The client told her they picked her because she understood their problem better than anyone else who pitched.

Not because she had reach. Because she had clarity.

She shared her framework with our community — three questions she asks before creating any piece of content:

Who loses sleep over the problem you solve?
What does their world look like the morning after you solve it?
Why are you the only person who can tell them this, right now?

When you can answer all three in one sentence, you're ready to grow your reach. Until then, more audience just means more noise.

Which of those three questions is hardest for you to answer right now? Drop it in the comments — let's work through it together.`,

  newsletter_blurb: `Maya Chen walked into the Cre8te Summit with a story that stopped the room: 47 followers, an $80,000 contract, and a framework she calls Clarity Before Reach. Her three diagnostic questions are the simplest content strategy reset we've seen, and they work at any audience size.`,
};

const FIXTURE_NEWSLETTER = {
  subject_line: 'The 47-follower $80K lesson from our Summit',
  full_draft: `SUBJECT: The 47-follower $80K lesson from our Summit
PREVIEW: What Maya Chen's story means for every creator in this community

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS WEEK'S HERO STORY

Maya Chen walked into the Cre8te Summit and stopped the room.

47 LinkedIn followers. $80,000 contract. Zero paid ads.

The client told her they chose her because she understood their problem better than anyone who pitched them. Not reach. Clarity.

Maya shared her Clarity Before Reach framework with us — three questions that any creator can answer today to cut through the noise and start converting. We captured the full session. [HERO_LINK]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS WEEK IN CRE8TE

→ The 3-question framework that replaces your content strategy [LINK_1]
→ 800 followers, booked 3 months out — what community-first actually looks like [LINK_2]  
→ "Slow is not stuck" — Maya's closing words that hit different [LINK_3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S HAPPENING IN THE CREATOR ECONOMY

Instagram expanded monetization access to mid-tier creators this week — subscription tools and bonus programs now available to accounts with 10K-100K followers. If you've been building steadily, this is worth checking.

A new AI tool is cutting post-production time by 70% for creators repurposing long-form content into short-form clips. We're testing it — report coming in next week's issue.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMUNITY SPOTLIGHT

"I applied Maya's three questions to my LinkedIn profile this week. Rewrote my headline in 20 minutes. Got two inbound messages the next day. This framework is real." — Cre8te Community member

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S COMING

Next week we're going deep on the business model conversation from the Summit — three creators who built six-figure businesses from communities under 1,000 people. Don't miss it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to build your Clarity Before Reach foundation? Join the Cre8te community and get access to the full Summit recording library. → [JOIN_LINK]`,
};

const FIXTURE_SCORES = [
  { item_number: 1, relevance: 9, novelty: 8, actionability: 9, use_case_tags: ['Newsletter Story', 'Platform Update'], summary: 'Instagram expanded monetization access to mid-tier creators, directly benefiting the Cre8te community audience building steadily toward 10K-100K followers. This is a significant policy shift worth covering in the newsletter.' },
  { item_number: 2, relevance: 9, novelty: 9, actionability: 10, use_case_tags: ['AI Tool', 'Content Idea', 'Workshop Signal'], summary: 'A new AI repurposing tool could save Cre8te creators hours of post-production time per week. The 70% time reduction claim is specific enough to build a tutorial workshop around.' },
];
