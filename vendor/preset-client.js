// dsh-preset-switcher client bundle.
//
// Module-loader format (the shell's ClientModuleSystem): executing this
// script only REGISTERS the factory; materialization runs factory(require)
// and the returned exports must be a Cordis plugin entry { name, inject,
// apply }. React comes from the module table's externals (require("react")).
// Everything else is plain DOM + fetch against the plugin's own fenced
// /preset-switch/api route.
window.__ModuleLoader__.load({
  id: "dsh-preset-switcher",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");

    // Built-in ids carry no host-side name (the app localizes them in the
    // browser), so the plugin keeps its own copy - matching the app's own
    // zh dictionary word for word (标准模式 / PTC 模式 / 极简模式 /
    // 创造模式). The ids are standard / ptc / minimal / cordis; the old
    // `code` key never matched, which is why the menu showed a bare
    // lowercase "ptc". Custom presets keep the host-provided name, then id.
    var PRESET_LABELS = { standard: "标准模式", ptc: "PTC 模式", minimal: "极简模式", cordis: "创造模式" };
    /** Display label for one preset (built-in map first, host name, then id). */
    function presetLabel(id, hostName) {
      var mapped = PRESET_LABELS[id];
      if (mapped !== undefined) return mapped;
      if (hostName !== undefined && hostName !== null && String(hostName) !== String(id)) return String(hostName);
      return String(id);
    }

    exports.name = "dsh-preset-switcher";
    exports.inject = ["slots"];

    //#region api
    /** One wire failure. */
    function apiError(message) {
      return new Error(message);
    }
    /** POST one method to the fenced route; resolves the unwrapped value. */
    function apiCall(method, payload) {
      return fetch("/preset-switch/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.assign({ method: method }, payload === void 0 ? {} : payload))
      }).then(function (response) {
        return response.json().catch(function () { return null; }).then(function (parsed) {
          if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) {
            throw apiError(
              parsed !== null && parsed !== void 0 && parsed.error !== void 0 && typeof parsed.error.message === "string"
                ? parsed.error.message
                : "HTTP " + response.status
            );
          }
          return parsed.value;
        });
      }).catch(function (error) {
        if (error instanceof Error) throw error;
        throw apiError(String(error));
      });
    }
    //#endregion

    //#region header action
    /**
    * The session-header dropdown: lists every agent preset, marks the one
    * the session currently runs, and switches on click. Works on started
    * sessions too - the host half skips the stock blank-session check. The
    * menu also offers a one-click "repair stale presets" action: sessions
    * whose recorded preset was deleted (custom preset removed) are rewritten
    * to the default preset so they can be reopened.
    */
    function PresetSwitchButton(props) {
      var sessionId = props.sessionId;
      var openState = React.useState(false);
      var open = openState[0];
      var setOpen = openState[1];
      var rowsState = React.useState([]);
      var rows = rowsState[0];
      var setRows = rowsState[1];
      var currentState = React.useState(null);
      var current = currentState[0];
      var setCurrent = currentState[1];
      var busyState = React.useState(false);
      var busy = busyState[0];
      var setBusy = busyState[1];
      var errorState = React.useState(null);
      var error = errorState[0];
      var setError = errorState[1];
      // Native-chip trigger state: when the header shows the app's own
      // preset chip (its text equals the current preset's label), that
      // chip becomes the dropdown trigger and our own button is not
      // rendered at all (user request 0.2.1: two controls were redundant).
      var badgeState = React.useState(false);
      var badgeFound = badgeState[0];
      var setBadgeFound = badgeState[1];
      var noteState = React.useState(null);
      var note = noteState[0];
      var setNote = noteState[1];
      var anchorState = React.useState(null);
      var anchor = anchorState[0];
      var setAnchor = anchorState[1];
      // React.useRef, not a plain object: a per-render `{ current: null }`
      // is replaced on every render, so the effect closure could read a
      // stale null, bail out on `marker === null` and silently bind
      // nothing. The stable object is shared by every render and by the
      // effect's cleanup (0.2.4).
      var wrapRef = React.useRef(null);
      // Narrow viewports: the session header has little room, so a long
      // label (custom preset names) starves the session title. Track
      // (max-width: 640px) to switch the button to the generic "模式".
      var narrowState = React.useState(function () {
        return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 640px)").matches;
      });
      var isNarrow = narrowState[0];
      var setNarrow = narrowState[1];
      React.useEffect(function () {
        if (typeof window.matchMedia !== "function") return undefined;
        var mq = window.matchMedia("(max-width: 640px)");
        function onChange(e) { setNarrow(e.matches); }
        if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);
        return function () {
          if (mq.removeEventListener) mq.removeEventListener("change", onChange); else mq.removeListener(onChange);
        };
      }, []);

      function refresh() {
        if (sessionId === void 0 || sessionId === null) return;
        apiCall("list", { sessionId: sessionId }).then(function (value) {
          if (Array.isArray(value.presets)) setRows(value.presets);
          setCurrent(value.current === void 0 || value.current === null ? null : value.current);
          setError(null);
        }).catch(function (e) {
          setError(e instanceof Error ? e.message : String(e));
        });
      }
      React.useEffect(function () { refresh(); }, [sessionId]);
      // A re-anchored viewport (rotation / resize) invalidates the
      // fixed-position menu coordinates: close it, let the user reopen.
      React.useEffect(function () {
        if (!open) return undefined;
        function close() { setOpen(false); }
        window.addEventListener("resize", close);
        window.addEventListener("orientationchange", close);
        return function () {
          window.removeEventListener("resize", close);
          window.removeEventListener("orientationchange", close);
        };
      }, [open]);

      // Make the app's own preset chip - the header badge the built-in
      // ui-agent-preset entry renders via AgentPresetLabel (a span holding
      // a 14px icon svg plus the preset's display name) - the dropdown
      // trigger. The badge ships its stylesheet as a
      // <style data-plugin-css="…/AgentPresetLabel.module.css"> tag, so the
      // real css-modules class (hash-suffixed, e.g. dscfja_label) is read
      // out of that tag at runtime: class lookup is exact and immune to
      // hash churn. Fallback: innermost text match on the badge's
      // localized name, compared with the native 「模式」 suffix stripped
      // from both sides (our menu shows 标准/PTC/…, the badge shows
      // 标准模式/PTC 模式/…). 0.2.2 failed twice over: it excluded the
      // shared header-actions container - which contains the badge too -
      // and matched labels the badge never displays. Clicks are
      // intercepted in the capture phase on body; the binding self-heals
      // on click when a re-render replaced the badge. No MutationObserver:
      // the chat scroller mutates body constantly while streaming, so a
      // body-wide observer would fire findChip nonstop.
      var chipRef = React.useRef(null);
      React.useEffect(function () {
        var marker = wrapRef.current;
        if (marker === null) return undefined;
        function chipText(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
        // Badge text vs menu label: strip the native 「模式」 suffix on
        // both sides ("标准模式"→"标准", "PTC 模式"→"PTC"). Custom preset
        // names ("OPS (PTC)") carry no suffix and compare as-is.
        function bare(text) {
          var t = String(text === null || text === void 0 ? "" : text).trim();
          if (t.length > 2 && t.slice(-2) === "模式") t = t.slice(0, t.length - 2).trim();
          return t;
        }
        // Labels the badge can be showing for the current preset: the
        // matched row's label first, then the raw-current fallback.
        function wantLabels() {
          var out = [];
          if (current === null || current === void 0) return out;
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].id === current) {
              var t = bare(presetLabel(rows[i].id, rows[i].name));
              if (t !== "" && out.indexOf(t) === -1) out.push(t);
            }
          }
          var fb = bare(presetLabel(current, null));
          if (fb !== "" && out.indexOf(fb) === -1) out.push(fb);
          return out;
        }
        // A display:none element is still queryable, and the native badge
        // IS display:none on a narrow header (its stylesheet hides
        // .<hash>_label under a container query at width<=540px). Without
        // this check the narrow layout "found" the invisible badge,
        // suppressed the fallback button and left no trigger at all.
        function visible(el) {
          if (el === null || el === void 0 || !el.isConnected) return false;
          if (typeof el.getClientRects === "function" && el.getClientRects().length === 0) return false;
          var r = el.getBoundingClientRect();
          return r.width > 1 && r.height > 1;
        }
        // Primary: read the badge's own stylesheet tag and query by the
        // real label class. AgentPresetLabel.module.css styles the badge
        // span with .<hash>_label (its icon is .<hash>_icon).
        function findBadgeByClass() {
          var tags = document.querySelectorAll('style[data-plugin-css$="AgentPresetLabel.module.css"]');
          for (var i = 0; i < tags.length; i++) {
            var m = /\.([A-Za-z0-9_-]+)_label\s*\{/.exec(tags[i].textContent || "");
            if (m === null) continue;
            var found = document.getElementsByClassName(m[1] + "_label");
            for (var j = 0; j < found.length; j++) {
              if (found[j].tagName === "SPAN" && visible(found[j])) return found[j];
            }
          }
          return null;
        }
        function findBadge() {
          var wants = wantLabels();
          var byClass = findBadgeByClass();
          if (byClass !== null && (wants.length === 0 || wants.indexOf(bare(chipText(byClass))) !== -1)) {
            return byClass;
          }
          // Fallback: innermost element whose text equals a wanted label.
          // Only our own overlay and our own slot marker are excluded - the
          // badge lives inside the shared header container (0.2.2 excluded
          // that whole container and could never find it).
          var overlay = document.getElementById("dsh-preset-switcher-overlay");
          var marker = wrapRef.current;
          var candidates = [];
          var all = document.body.querySelectorAll("*");
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (marker !== null && marker.contains(el)) continue;
            if (overlay !== null && overlay.contains(el)) continue;
            var t = chipText(el);
            if (t === "") continue;
            for (var k = 0; k < wants.length; k++) {
              // Text first, box second: getClientRects forces layout, so
              // testing it for every element in the body on every bind is
              // far too expensive. Only a text match reaches this check.
              if (t === wants[k] && visible(el)) { candidates.push(el); break; }
            }
          }
          // Innermost match: drop candidates that contain another one
          // (a wrapper's text also collapses to the badge label).
          var inner = candidates.filter(function (c) {
            for (var j = 0; j < candidates.length; j++) {
              if (candidates[j] !== c && c.contains(candidates[j])) return false;
            }
            return true;
          });
          return inner.length > 0 ? inner[0] : null;
        }
        // Plain local of THIS effect run, not a ref: everything below runs
        // inside the effect callback, so a hook here is an invalid hook
        // call (React #321 - the 0.2.4 regression that killed the whole
        // slot entry). Scope is exactly right anyway: the effect's cleanup
        // restores the badge's own tooltip before the next run reads it.
        var origTitle = null;
        function bindChip(trace) {
          var chip = findBadge();
          chipRef.current = chip;
          if (chip !== null) {
            chip.style.cursor = "pointer";
            if (origTitle === null) origTitle = chip.getAttribute("title");
            chip.setAttribute("title", "点击切换模式");
            if (trace) {
              try { console.info("[preset-switcher] chip trigger bound:", chip.tagName + "." + String(chip.className || "")); } catch (e2) {}
            }
          } else if (trace) {
            try { console.info("[preset-switcher] chip not found for labels:", wantLabels().join(" / ") || "(none)"); } catch (e2) {}
          }
          setBadgeFound(chip !== null);
          return chip;
        }
        function onCapture(e) {
          var chip = chipRef.current;
          if (chip === null || !chip.isConnected) chip = bindChip(false);
          if (chip === null) return;
          var t = e.target;
          if (t === null || t.nodeType !== 1 || !chip.contains(t)) return;
          e.stopPropagation();
          e.preventDefault();
          if (!open) {
            var rect = chip.getBoundingClientRect();
            setAnchor({ top: rect.top, bottom: rect.bottom, right: rect.right });
            setOpen(true);
          }
        }
        document.body.addEventListener("click", onCapture, true);
        bindChip(true);
        // The badge's visibility is driven by a container query on the
        // header's own width, which changes without any window resize
        // (phone layout, sidebar toggle, split pane). Watching our slot's
        // parent flips the binding between badge and fallback button.
        var host = wrapRef.current === null ? null : wrapRef.current.parentElement;
        var observer = null;
        if (host !== null && typeof ResizeObserver === "function") {
          var lastBox = host.clientWidth + "x" + host.clientHeight;
          observer = new ResizeObserver(function () {
            var box = host.clientWidth + "x" + host.clientHeight;
            if (box === lastBox) return;
            lastBox = box;
            bindChip(false);
          });
          observer.observe(host);
        }
        return function () {
          document.body.removeEventListener("click", onCapture, true);
          if (observer !== null) observer.disconnect();
          var chip = chipRef.current;
          if (chip !== null && chip.isConnected) {
            chip.style.cursor = "";
            // Restore the badge's own tooltip (headerHint / description),
            // not wipe it.
            if (origTitle === null) chip.removeAttribute("title");
            else chip.setAttribute("title", origTitle);
          }
          chipRef.current = null;
        };
      }, [current, rows, open]);

      // The overlay (backdrop + menu + diagnostic chip) is plain DOM
      // mounted into document.body once for the component's life: it can
      // never be clipped by header overflow, cannot be lost behind a
      // transformed ancestor, and does not depend on the host's React
      // external exposing createPortal. No scroll listener: the DSH chat
      // scroller fires constantly during streaming, and the old
      // capture-phase close listener auto-collapsed the menu the moment
      // it opened.
      // Must be React.useRef, not a plain object: React recreates a plain
      // per-render variable, so the mount effect wrote the body root into
      // render #1's object while this effect - re-run on a later render -
      // read a fresh null and silently bailed out (0.1.7: no menu, no
      // chip, no error; the console only showed the anchor log).
      var overlayRootRef = React.useRef(null);
      React.useEffect(function () {
        var root = document.createElement("div");
        root.id = "dsh-preset-switcher-overlay";
        root.style.display = "contents";
        document.body.appendChild(root);
        overlayRootRef.current = root;
        return function () {
          if (root.parentNode !== null) root.parentNode.removeChild(root);
          overlayRootRef.current = null;
        };
      }, []);
      React.useEffect(function () {
        var root = overlayRootRef.current;
        if (root === null) return undefined;
        while (root.firstChild !== null) root.removeChild(root.firstChild);
        if (!open) return undefined;

        var backdrop = document.createElement("div");
        backdrop.style.cssText = "position:fixed;inset:0;z-index:99998;background:transparent;";
        backdrop.addEventListener("click", function () { setOpen(false); });
        root.appendChild(backdrop);

        // Row hover from the native menu token (--dsw-alias-interactive-bg-hover);
        // disabled rows dim like the app's own menus. Scoped to our menu id,
        // refreshed with each rebuild.
        var hoverStyle = document.createElement("style");
        hoverStyle.textContent =
          "#dsh-preset-switcher-menu button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,0.08)); }" +
          "#dsh-preset-switcher-menu button:disabled { opacity: 0.4; cursor: not-allowed; }";
        root.appendChild(hoverStyle);

        var menu = document.createElement("div");
        menu.id = "dsh-preset-switcher-menu";
        // Same surface recipe as the app's own dropdowns (primitives Menu):
        // translucent --dsw-specific-menu + heavy backdrop blur, 16px panel
        // radius, no border - the hairline ring comes from the elevation
        // shadow's first segment via --dsw-elevation-stroke-color.
        menu.style.cssText = "position:fixed;z-index:99999;width:" + MENU_WIDTH +
          "px;background:var(--dsw-specific-menu,rgba(42,43,47,0.98));color:var(--dsw-alias-label-primary,#f9fafb);" +
          "border:0;border-radius:var(--dsw-radius-lg,16px);padding:4px;" +
          "backdrop-filter:blur(40px) saturate(150%);-webkit-backdrop-filter:blur(40px) saturate(150%);";
        menu.style.boxShadow = "var(--dsw-elevation-prominent,0 3px 8px rgba(0,0,0,0.04),0 0 20px rgba(0,0,0,0.05))";
        menu.style.setProperty("--dsw-elevation-stroke-color", "var(--dsw-alias-border-l1,rgba(255,255,255,0.1))");
        var menuLeft, menuTop;
        if (anchor !== null) {
          menuLeft = Math.max(8, Math.min(anchor.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
          var estHeight = rows.length * 34 + 90;
          menuTop = anchor.bottom + 4;
          if (menuTop + estHeight > window.innerHeight - 8) menuTop = Math.max(8, anchor.top - estHeight - 4);
        } else {
          menuLeft = 8;
          menuTop = 8;
        }
        menu.style.left = menuLeft + "px";
        menu.style.top = menuTop + "px";

        if (rows.length === 0) {
          var loading = document.createElement("div");
          loading.style.cssText = "padding:6px 8px;color:var(--dsw-alias-label-tertiary,#9ca1ad);font-size:11px;line-height:15px;";
          loading.textContent = busy ? "切换中…" : "加载中…";
          menu.appendChild(loading);
        }
        rows.forEach(function (row) {
          var isCurrent = row.id === current;
          var b = document.createElement("button");
          b.type = "button";
          b.disabled = busy;
          b.style.cssText = "display:flex;align-items:center;gap:6px;box-sizing:border-box;width:100%;min-height:34px;" +
            "padding:6px 8px;border-radius:var(--dsw-radius-md,12px);border:none;background:transparent;" +
            "color:var(--dsw-alias-label-primary,#f9fafb);cursor:" + (isCurrent ? "default" : "pointer") + ";" +
            "font-size:13px;line-height:20px;text-align:left;";
          var labelSpan = document.createElement("span");
          labelSpan.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          labelSpan.textContent = presetLabel(row.id, row.name);
          b.appendChild(labelSpan);
          if (isCurrent) {
            // Native selected row: no fill, no bolding - just the right-edge check.
            var check = document.createElement("span");
            check.style.cssText = "flex:none;";
            check.textContent = "✓";
            b.appendChild(check);
          }
          b.addEventListener("click", function () { onPick(row.id); });
          menu.appendChild(b);
        });
        if (error !== null) {
          var errBox = document.createElement("div");
          errBox.style.cssText = "padding:6px 8px;color:var(--dsw-alias-state-error-primary,#f25a5a);font-size:12px;line-height:1.5;white-space:normal;";
          errBox.textContent = String(error);
          menu.appendChild(errBox);
        }
        if (note !== null) {
          var noteBox = document.createElement("div");
          noteBox.style.cssText = "padding:6px 8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-success-primary,#22c55e);" +
            "white-space:normal;";
          noteBox.textContent = String(note);
          menu.appendChild(noteBox);
        }
        menu.addEventListener("click", function (e) { e.stopPropagation(); });
        root.appendChild(menu);

        return function () {
          while (root.firstChild !== null) root.removeChild(root.firstChild);
        };
      }, [open, rows, error, note, busy, anchor]);

      if (sessionId === void 0 || sessionId === null) return null;

      var currentRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === current) { currentRow = rows[i]; break; }
      }
      var label = currentRow !== null
        ? presetLabel(currentRow.id, currentRow.name)
        : (current === null ? "模式" : presetLabel(current, null));
      // Long labels (custom preset names) shrink to "模式" on narrow
      // screens so the session title keeps its space; built-in short
      // names (创造/标准/PTC/极简) stay visible.
      var displayLabel = isNarrow && label.length > 4 ? "模式" : label;

      function onPick(id) {
        if (busy || id === current) { setOpen(false); return; }
        setBusy(true);
        setError(null);
        setNote(null);
        apiCall("switch", { sessionId: sessionId, presetId: id }).then(function (value) {
          if (value !== null && typeof value === "object" && (value.repaired === true || value.deferred === true)) {
            // Not-loaded session: either its stale reference was repaired, or
            // the selection was recorded as a deferred log event. Either way
            // the change applies when the session is reopened.
            setNote(typeof value.message === "string" ? value.message : "已记录，重新打开会话时生效。");
            setOpen(false);
            refresh();
          } else {
            setOpen(false);
            refresh();
          }
        }).catch(function (e) {
          setError(e instanceof Error ? e.message : String(e));
        }).finally(function () { setBusy(false); });
      }

      var buttonStyle = {
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--dsw-alias-border-l1, rgba(140, 145, 160, 0.4))",
        background: "transparent", color: "var(--dsw-alias-label-secondary, #9ca1ad)",
        cursor: busy ? "progress" : "pointer", fontSize: "12px", lineHeight: "1.4",
        whiteSpace: "nowrap",
        maxWidth: "11em", overflow: "hidden", textOverflow: "ellipsis"
      };
      // The imperative overlay (rebuilt into the body root by the effect
      // above) needs only the menu width: anchor = wrapper rect captured
      // on open, clamped to the viewport, opens upward when there is no
      // room below. Colors carry readable dark-theme fallbacks because
      // theme variables may be scoped to the app root, outside this
      // body-level mount.
      var MENU_WIDTH = 220;

      // Overlay note (0.1.7): the React createPortal block was removed;
      // the backdrop, menu and diagnostic chip are now rebuilt
      // imperatively into the body-mounted #dsh-preset-switcher-overlay
      // root, so nothing from here feeds the header's return children.

      // 0.2.1: with the native chip acting as the trigger, this slot
      // renders only an invisible marker (the chip handler above anchors
      // from the chip itself). The classic button returns as a fallback
      // whenever no chip matched.
      return React.createElement(
        "div",
        {
          style: { display: "inline-flex", alignItems: "center" },
          ref: function (node) { wrapRef.current = node; }
        },
        React.createElement("span", {
          "aria-hidden": "true",
          style: { display: "inline-block", width: "0", height: "0", overflow: "hidden" }
        }),
        badgeFound ? null : React.createElement("button", {
          type: "button",
          onClick: function () {
            if (!open && wrapRef.current !== null) {
              var rect = wrapRef.current.getBoundingClientRect();
              setAnchor({ top: rect.top, bottom: rect.bottom, right: rect.right });
              try {
                console.info("[preset-switcher] menu anchor", {
                  top: Math.round(rect.top), bottom: Math.round(rect.bottom), right: Math.round(rect.right),
                  vw: window.innerWidth, vh: window.innerHeight
                });
              } catch (err) {}
            }
            setOpen(!open);
          },
          disabled: busy,
          title: error === null ? ("当前模式：" + label + "（点击切换，任意时刻生效）") : String(error),
          style: buttonStyle
        }, displayLabel, open ? " ▴" : " ▾"),
        error !== null && React.createElement("span", {
          style: { marginLeft: "4px", color: "var(--dsw-alias-state-error-primary, #ef6a6a)", fontSize: "11px" }
        }, "⚠")
      );
    }

    exports.apply = function (ctx) {
      ctx.effect(function () {
        return ctx.slots.inject("conversation.session.header.actions", function () {
          return ctx.slots.register({
            name: "conversation.session.header.actions",
            id: "preset-switch",
            order: 15,
            label: "切换模式",
            registrant: "dsh-preset-switcher"
          }, PresetSwitchButton);
        });
      }, "dsh-preset-switcher: header action");
    };
    //#endregion

    return module.exports;
  }
});
