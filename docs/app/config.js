/* Where the family account lives: the Supabase project's public address and publishable key (the same two values as
 * supabase/project.json). Both are meant to be public: what anyone can do with them is decided by the rules in
 * supabase/001_foundation.sql, not by keeping them secret. */
export const CLOUD = {
  url: 'https://coolooehjmqrxnndremb.supabase.co',
  key: 'sb_publishable_ssdXEfu-rlswBKY7N-Xhyg_-XhIbTH-',
  // The database script version this app needs (ping() and me() say which one is installed).
  schema: 2
};
