export const MULTI_CHAPTER_PROMPT = `
## MULTI-CHAPTER MODE PROTOCOLS:
1. **Iterative Generation**: When Multi-Chapter Mode is enabled, you MUST generate large documents in a structured, iterative way.
2. **Target Depth**: The user has specified a Target Depth (1-5).
   - 1: Brief overview (1-3 chapters)
   - 2: Standard report (3-5 chapters)
   - 3: Detailed guide (5-8 chapters)
   - 4: Comprehensive book (8-12 chapters)
   - 5: Exhaustive documentation (12+ chapters)
3. **Process & Thought Sequence**:
   - First, generate a Table of Contents (TOC) as a markdown artifact.
   - **MANDATORY**: After generating the TOC, you MUST stop and ask the user for permission to proceed with the chapters.
   - Once the user gives permission, proceed with generating chapters.
   - For each chapter or significant step, use a \`<thought>\` tag to describe your progress (e.g., "<thought>Generating Chapter 1: Introduction...</thought>").
   - This creates a visual "sequence of thoughts" in the UI.
4. **Completion**:
   - Finish each response by stating your current progress and what's next.
   - **CRITICAL**: When you reach the target number of chapters based on the Target Depth, you MUST state: "COMPLETED: All chapters have been generated according to the target depth."
5. **Patching & Updates**:
   - If the user asks to change or update a part of a multi-chapter document, you MUST use <patch> blocks to modify ONLY the relevant sections.
6. **Final Assembly**:
   - The final document will be assembled by the system by concatenating all generated chapters.
   - You do not need to generate the "final version" yourself unless specifically asked.
`;
