// Word-level editor logic with custom keyboard and mouse selection
(() => {
  // Get the editor container
  const editor = document.getElementById("editor");

  // Seed text (grab whatever transcript you like)
  const initialText =
    `Germany in 2021 kind of during the COVID lockdown times. ` +
    `And I think that was a bit of the motivation — getting a change of scenery. ` +
    `You and your wife moved at the same time.`;

  // Build one <span class="token"> per word (including trailing space for continuous highlight)
  initialText.match(/\S+\s*/g).forEach((chunk) => {
    const span = document.createElement("span");
    span.className = "token";
    span.textContent = chunk; // include trailing space for continuous highlight
    span.contentEditable = "false"; // caret never sits inside
    editor.appendChild(span);
  });

  // ————— helpers —————
  // Places the caret before a given node, or at the end if node is null
  const placeCaret = (node) => {
    const sel = window.getSelection();
    const range = document.createRange();
    if (node) range.setStartBefore(node);
    else range.selectNodeContents(editor), range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // Finds the adjacent .token span in the given direction ('back' or 'fwd')
  const adjacentToken = (range, dir) => {
    let n = range.startContainer,
      off = range.startOffset;
    if (n.nodeType === Node.TEXT_NODE) {
      n = dir === "back" ? n.previousSibling : n.nextSibling;
    } else {
      n = dir === "back" ? n.childNodes[off - 1] : n.childNodes[off];
    }
    while (n && !(n.classList && n.classList.contains("token"))) {
      n = dir === "back" ? n.previousSibling : n.nextSibling;
    }
    return n;
  };

  // Deletes a list of .token spans and places the caret at the next logical position
  const deleteTokens = (list) => {
    if (!list.length) return;
    const next = list[list.length - 1].nextSibling;
    list.forEach((t) => t.remove());
    placeCaret(next);
  };

  // ————— keyboard logic —————
  // Handles backspace/delete and left/right arrow navigation
  editor.addEventListener("keydown", (e) => {
    // Custom left/right navigation: move selection to previous/next token
    // Only intercept if Shift is NOT held (so Shift+Arrow does range selection)
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (e.shiftKey) return; // Let browser handle range selection
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      // Find the currently selected token (if any)
      let currentToken = null;
      if (!range.collapsed) {
        // If a range is selected, use the first token in the selection
        const tokens = Array.from(editor.querySelectorAll(".token")).filter(
          (t) => range.intersectsNode(t)
        );
        if (tokens.length) currentToken = tokens[0];
      } else {
        // If caret is at a token, try to find the token at caret
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        if (node.classList && node.classList.contains("token")) {
          currentToken = node;
        }
      }
      if (currentToken) {
        e.preventDefault();
        const nextToken =
          e.key === "ArrowLeft"
            ? currentToken.previousSibling
            : currentToken.nextSibling;
        // Skip non-token nodes
        let target = nextToken;
        while (
          target &&
          !(target.classList && target.classList.contains("token"))
        ) {
          target =
            e.key === "ArrowLeft" ? target.previousSibling : target.nextSibling;
        }
        if (target) {
          // Select the target token
          const newRange = document.createRange();
          newRange.selectNode(target);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
      return;
    }

    // Handle Backspace/Delete for word-level deletion
    if (e.key !== "Backspace" && e.key !== "Delete") return;

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // If a range is selected, delete all intersecting tokens
    if (!range.collapsed) {
      e.preventDefault();
      const victims = Array.from(editor.querySelectorAll(".token")).filter(
        (t) => range.intersectsNode(t)
      );
      deleteTokens(victims);
      return;
    }

    // If caret only, remove previous/next token
    e.preventDefault();
    const token = adjacentToken(range, e.key === "Backspace" ? "back" : "fwd");
    if (token) deleteTokens([token]);
  });

  // ————— click-to-select logic —————
  // Ensures clicking a .token always selects that word
  editor.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList && target.classList.contains("token")) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNode(target);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  // ————— simulated mouse drag selection —————
  // Allows click-drag selection across multiple .token spans (even across lines)
  let isSelecting = false;
  let selectionStart = null;
  let selectionEnd = null;

  // Start selection on mousedown
  editor.addEventListener("mousedown", (e) => {
    if (e.target.classList && e.target.classList.contains("token")) {
      isSelecting = true;
      selectionStart = e.target;
      selectionEnd = e.target;
      // Prevent default to avoid native selection
      e.preventDefault();
    }
  });

  // Expand selection on mouseover (while mouse is down)
  editor.addEventListener("mouseover", (e) => {
    if (
      isSelecting &&
      e.target.classList &&
      e.target.classList.contains("token")
    ) {
      selectionEnd = e.target;
      // Programmatically select the range
      const tokens = Array.from(editor.querySelectorAll(".token"));
      const startIdx = tokens.indexOf(selectionStart);
      const endIdx = tokens.indexOf(selectionEnd);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] =
          startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStartBefore(tokens[from]);
        range.setEndAfter(tokens[to]);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  });

  // End selection on mouseup
  document.addEventListener("mouseup", (e) => {
    if (isSelecting) {
      isSelecting = false;
      selectionStart = null;
      selectionEnd = null;
    }
  });
})();
