import type { Permission } from "./permission";

export type Operator = {
    id: string;
    username: string;
    name: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    active: boolean;
    permissions: Permission[]
}