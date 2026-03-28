export const MULTI_CHAPTER_PROMPT = `
## MULTI-CHAPTER MODE PROTOCOLS:
1. **Iterative Generation**: When Multi-Chapter Mode is enabled, you MUST generate large documents in a structured, iterative way.
2. **Target Depth**: The user has specified a Target Depth (1-5).
   - 1: Brief overview (1-3 chapters)
   - 2: Standard report (3-5 chapters)
   - 3: Detailed guide (5-8 chapters)
   - 4: Comprehensive book (8-12 chapters)
   - 5: Exhaustive documentation (12+ chapters)
3. **Autonomy**: 
   - DO NOT ask for permission to continue after each chapter if the overall plan (TOC) is already approved.
   - Instead, finish each response by stating: "Chapter [N] complete. I am ready to proceed to Chapter [N+1]."
   - If you can fit multiple chapters in one response without sacrificing quality or hitting token limits, do so.
4. **Process**:
   - First, generate a Table of Contents (TOC) as a markdown artifact.
   - Then, generate each chapter one by one in subsequent turns.
   - Use the current artifact context to maintain continuity.
5. **Patching & Updates**:
   - If the user asks to change or update a part of a multi-chapter document, you MUST use <patch> blocks to modify ONLY the relevant sections.
   - You must maintain consistency across all chapters.
   - When updating, refer to the TOC and other chapters to ensure the changes are integrated correctly.
6. **Context Awareness**:
   - Do not repeat information across chapters unless necessary for clarity.
   - Keep track of the "Cumulative Summary" and "Knowledge Graph" if provided in context.
7. **Final Assembly**:
   - Once all chapters are generated, offer to "Assemble the final version" which merges all chapters into a single comprehensive artifact if requested, or maintain them as separate chapters in the project structure.
`;
