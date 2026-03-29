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
   - **MANDATORY**: For the Table of Contents, generate a markdown artifact with the title "Table of Contents".
   - **MANDATORY**: For EVERY chapter or section, you MUST generate it as a SEPARATE markdown artifact.
   - **STRICT RULE**: Generate ONLY ONE chapter per response. This is a hard constraint to ensure maximum detail and quality for each section.
     - **Title Format**: "Chapter X: [Title]" (e.g., "Chapter 1: Introduction").
     - **Sub-section Numbering**: Within each chapter, you MUST use hierarchical numbering for sub-sections. Instead of "1.", "2.", "3.", use "[Chapter Number].[Section Number]" (e.g., "4.1", "4.2", "4.3" for Chapter 4).
     - **CRITICAL**: Do NOT include the word "TOC" or "Table of Contents" in the title of chapter artifacts.
   - **Thought Sequence**:
     - After generating the TOC, you MUST stop.
     - For each subsequent response, you MUST generate ONLY ONE chapter to maximize the output context and detail for each section.
     - For each chapter, use a <thought> tag to describe your progress (e.g., "<thought>Generating Chapter 1: Introduction...</thought>").
4. **Completion**:
   - Finish each response by stating your current progress and what's next.
   - **CRITICAL**: You MUST only state "COMPLETED: All chapters have been generated according to the target depth." in the response that contains the ACTUAL CONTENT of the very last chapter. 
   - **STRICT RULE**: Do NOT state "COMPLETED" if you are announcing a "Next Step" that involves generating another chapter. If there is a "Next Step" chapter, the project is NOT completed.
5. **Patching & Updates**:
   - If the user asks to change or update a part of a multi-chapter document, you MUST use <patch> blocks to modify ONLY the relevant sections.
6. **Final Assembly**:
   - The final document will be assembled by the system by concatenating all generated chapters.
   - You do not need to generate the "final version" yourself unless specifically asked.
`;
