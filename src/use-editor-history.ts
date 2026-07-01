import { useCallback, useReducer } from "react";
import type { EditorState } from "./types";

type EditorUpdater = EditorState | ((current: EditorState) => EditorState);

interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
  interactionBase: EditorState | null;
}

type HistoryAction =
  | { type: "commit"; updater: EditorUpdater }
  | { type: "begin" }
  | { type: "transient"; updater: EditorUpdater }
  | { type: "finish" }
  | { type: "undo" }
  | { type: "redo" };

function resolve(current: EditorState, updater: EditorUpdater) {
  return typeof updater === "function" ? updater(current) : updater;
}

function changed(a: EditorState, b: EditorState) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function append(history: EditorState[], entry: EditorState) {
  return [...history, entry].slice(-80);
}

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "commit": {
      const next = resolve(state.present, action.updater);
      if (!changed(state.present, next)) return state;
      return {
        past: append(state.past, state.present),
        present: next,
        future: [],
        interactionBase: null
      };
    }
    case "begin":
      return state.interactionBase ? state : { ...state, interactionBase: state.present };
    case "transient":
      return { ...state, present: resolve(state.present, action.updater) };
    case "finish":
      if (!state.interactionBase || !changed(state.interactionBase, state.present)) {
        return { ...state, interactionBase: null };
      }
      return {
        past: append(state.past, state.interactionBase),
        present: state.present,
        future: [],
        interactionBase: null
      };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        interactionBase: null
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: append(state.past, state.present),
        present: next,
        future: state.future.slice(1),
        interactionBase: null
      };
    }
  }
}

export function useEditorHistory(initial: EditorState) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    interactionBase: null
  });

  return {
    editor: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit: useCallback((updater: EditorUpdater) => dispatch({ type: "commit", updater }), []),
    beginInteraction: useCallback(() => dispatch({ type: "begin" }), []),
    updateInteraction: useCallback(
      (updater: EditorUpdater) => dispatch({ type: "transient", updater }),
      []
    ),
    finishInteraction: useCallback(() => dispatch({ type: "finish" }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), [])
  };
}
