/**
 * Merge conditional class name fragments into a single string.
 * Kept dependency-free; swap for `clsx` + `tailwind-merge` if needed later.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
