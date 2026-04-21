/** Internal developer logging; never shown in end-user UI. */
const PREFIX = "[abc-muse][conversion]";

export const devLog = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug(PREFIX, ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(PREFIX, ...args);
  },
};
