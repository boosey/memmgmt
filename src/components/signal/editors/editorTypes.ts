import type { Entity } from "@/core/entities";

export interface EditorApi {
  getSerializedContent: () => string;
  currentTitle?: string;
}

export interface TypedEditorProps {
  entity: Entity;
  onApiReady: (api: EditorApi) => void;
  /** Called whenever currentTitle changes — drives RightRail "Writes to" preview. */
  onTitleChange?: (title: string) => void;
}
