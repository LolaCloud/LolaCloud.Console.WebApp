import type { LolaPermissions } from "../enums/permissions.enum"

export type Permission = {
    slug: LolaPermissions,
    service: string
}