import { getAccessToken } from "@/modules/ci/utils";
import axios from "axios";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Nullable<T> = T | null;

export const baseAPI = axios.create({
    baseURL: import.meta.env.VITE_LOLA_SERVICE_URL
})
baseAPI.interceptors.request.use(req => {
  req.headers.Authorization = `Bearer ${getAccessToken()}`;
  return req
})