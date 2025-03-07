export interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
  [key: string]: any;
}

export interface VideoMetadata {
  title: string;
  creator: string;
}
