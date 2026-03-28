export const MULTI_CHAPTER_PROMPT = `
## MULTI-CHAPTER MODE PROTOCOLS:
1. **Iterative Generation**: When Multi-Chapter Mode is enabled, you MUST generate large documents in a structured, iterative way.
2. **Target Depth**: The user has specified a Target Depth (1-5).
   - 1: Brief overview (1-3 chapters)
   - 2: Standard report (3-5 chapters)
   - 3: Detailed guide (5-8 chapters)
   - 4: Comprehensive book (8-12 chapters)
   - 5: Exhaustive documentation (12+ chapters)
3. **Autonomy & Completion**: 
   - DO NOT ask for permission to continue after each chapter if the overall plan (TOC) is already approved.
   - Finish each response by stating: "Chapter [N] complete. I am ready to proceed to Chapter [N+1]."
   - **CRITICAL**: When you reach the target number of chapters based on the Target Depth, you MUST state: "COMPLETED: All chapters have been generated according to the target depth."
   - DO NOT suggest further chapters once you have reached the target depth unless the user explicitly asks for more.
4. **Process**:
   - First, generate a Table of Contents (TOC) as a markdown artifact.
   - Then, generate each chapter one by one in subsequent turns.
   - Use the current artifact context to maintain continuity.
5. **Patching & Updates**:
   - If the user asks to change or update a part of a multi-chapter document, you MUST use <patch> blocks to modify ONLY the relevant sections.
   - You must maintain consistency across all chapters.
6. **Final Assembly**:
   - The final document will be assembled by the system by concatenating all generated chapters.
   - You do not need to generate the "final version" yourself unless specifically asked to rewrite the whole thing.
   - Your job is to ensure each chapter is a high-quality, standalone section that fits into the overall structure.
`;
