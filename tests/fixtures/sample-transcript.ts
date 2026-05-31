/**
 * Sample Summit transcript fixture — used by all Phase 2 tests.
 * Represents a real-world Cre8te Summit session format.
 */
export const SAMPLE_TRANSCRIPT = `
[Host]
Welcome back everyone. We have an incredible session coming up. 
I'm here with Maya Chen, who built her creative agency from zero 
to seven figures in 36 months without running a single paid ad. 
Maya, let's get into it.

[Maya Chen]
Thanks for having me. You know what's funny? The moment I stopped 
trying to go viral was the moment everything changed. I used to 
wake up every morning and check my analytics like they were a 
report card. Red numbers meant I was failing. Green meant I was 
worthy. That is a terrible way to run a creative business.

[Host]
That's such a real trap. When did you realize something had to shift?

[Maya Chen]
I had 47 followers on LinkedIn. I'm not joking. Forty-seven. And I 
landed a $80,000 contract from a post that got eleven likes. Eleven.
The client told me later they chose me because my post showed them 
I understood their problem better than anyone else who pitched them.
Not because I had reach. Because I had clarity.

The framework I teach now — I call it the Clarity Before Reach 
principle. You cannot amplify what you haven't clarified. Most 
creators are trying to reach more people with a message that isn't 
even working for the people they already have.

[Host]
Break down that framework for us. What does clarity actually mean 
in practice?

[Maya Chen]
Three questions. First: who loses sleep over the problem you solve? 
Not who finds it interesting — who is losing sleep over it. Second: 
what does the world look like for them the morning after you've 
solved it? Not the features, the feeling. Third: why are you the 
only person who can tell them this right now, in this way?

When you can answer all three in one sentence, you're ready to 
reach. Until then, more reach just means more noise.

[Host]
I love that. And this applies across platforms?

[Maya Chen]
Every single platform. But here's what I'll add — and this is the 
part creators don't want to hear. Community is not a vanity metric. 
The 47 people who were actually reading my posts, they were telling 
other people about me. Word of mouth is still the most powerful 
distribution channel on Earth. Your job isn't to get followers. 
Your job is to get people talking.

[Host]
That's the Cre8te ethos right there. Community-first, always.

[Maya Chen]
Exactly. And the irony is that when you focus on the community you 
have, you end up with a much bigger community than if you had been 
chasing reach the whole time. I have a client who has 800 followers 
and books out three months in advance. Eight hundred. Because those 
800 people evangelize for her.

[Host]
Last question — what's the one thing you wish someone had told you 
at the beginning?

[Maya Chen]
That slow is not the same as stuck. We live in a culture that 
conflates speed with success. Some of the most durable creative 
businesses I know took three, four years to reach their tipping 
point. And then overnight everyone thought they blew up overnight. 
Slow is not stuck. Slow is sometimes exactly right.
`;

export const SAMPLE_ASSET = {
  id: 'test-asset-001',
  values: {
    'c-exr99MOr1E': { value: 'Maya Chen — Clarity Before Reach — Cre8te Summit 2025' },
    'c-xnbJyz02A3': { value: 'Summit Recording' },
    'c-F81yd6um8G': { value: 'Maya Chen' },
    'c-1o4YGF8Ov4': { value: 'https://drive.google.com/uc?export=download&id=test123' },
    'c-SoghuKkr2r': { value: '2025-06-14' },
    'c-BRN4p-Xq0A': { value: 'Complete' },
    'c-FFKyvivHkc': { value: SAMPLE_TRANSCRIPT },
    'c-RdZqJeJu_D': { value: 'clarity, reach, community, creative business, framework, word of mouth, personal brand' },
    'c-6hFNqbKizF': { value: true },
  },
};

export const SAMPLE_KB_ENTRIES = [
  '[Principle] Community-first always — content that serves the existing community grows faster than content chasing new audiences',
  '[Principle] Specific over generic — quote real moments, real speakers, real names',
  '[Hook] The moment I stopped trying to go viral was the moment everything changed',
  '[Phrase] Slow is not the same as stuck',
  '[Phrase] You cannot amplify what you have not clarified',
];

export const SAMPLE_RESEARCH_ITEMS = [
  {
    title: 'Instagram rolls out new creator monetization features for mid-tier accounts',
    summary: 'Instagram announced expanded monetization access for creators with 10k-100k followers, including subscription tools and bonus programs previously limited to larger accounts. This directly addresses creator economy fragmentation concerns raised at major industry events.',
    use_case_tags: 'Newsletter Story, Platform Update',
    final_score: 8.7,
  },
  {
    title: 'New AI tool automates short-form video repurposing from long-form content',
    summary: 'A new tool leverages AI to automatically identify highlight moments in long-form videos and reformat them for TikTok, Reels, and Shorts with captions and hooks. Early users report 70% reduction in post-production time for content creators.',
    use_case_tags: 'AI Tool, Content Idea',
    final_score: 9.1,
  },
];
