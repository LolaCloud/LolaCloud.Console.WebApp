import { deleteAccessToken, getAccessToken } from "@/modules/ci/utils";
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
baseAPI.interceptors.response.use(function onFulfilled(response) {
    return response;
  }, function onRejected(error) {
    if (error.status === 401) {
      deleteAccessToken();
      window.location.href = '/ci/sign-in'
    }
    return Promise.reject(error);
  });