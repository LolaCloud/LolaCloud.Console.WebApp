import type { Nullable } from "@/lib/utils"

export function setAccessToken(token: string) {
    localStorage.setItem('access_token', token)
}

export function deleteAccessToken() {
    localStorage.removeItem('access_token')
}

export function getAccessToken(): Nullable<string> {
    return localStorage.getItem('access_token')
}