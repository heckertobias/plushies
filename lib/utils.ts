import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function photoUrl(photoPath: string): string {
  const filename = photoPath.split("/").pop();
  return `/api/uploads/${filename}`;
}
