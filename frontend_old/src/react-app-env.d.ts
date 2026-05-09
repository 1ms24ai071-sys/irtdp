/// <reference types="react-scripts" />

declare module '*.css';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.webp';
declare module '*.gif';

declare const process: {
  env: {
    REACT_APP_API_URL?: string;
    [key: string]: string | undefined;
  };
};

declare function require(path: string): string;
