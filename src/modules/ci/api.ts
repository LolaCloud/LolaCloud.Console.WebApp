import { baseAPI, type Nullable } from '@/lib/utils';
import type { Operator } from './types/operator';
import type { LolaPermissions } from './enums/permissions.enum';
import type { Session } from './types/session';

type AuthenticateProps = {
    username: string;
    password: string
}
type AuthenticateResponse = {
    access_token: string
}
export async function authenticate(payload: AuthenticateProps): Promise<AuthenticateResponse> {
    const response = await baseAPI.post('/v1/auth/sign-in', payload);
    return response.data
}

type UpdatePasswordDTO = {
    newPassword: string
}
export async function updateOperatorPassword(payload: UpdatePasswordDTO): Promise<void> {
    const response = await baseAPI.post('/v1/auth/update-password', payload);
    return response.data
}

type MeResponse = {
    operator: Operator
}
export async function getCurrentUserData(): Promise<MeResponse> {
    const response = await baseAPI.get('/v1/operator/me');
    return response.data;
}

type GetAllOperatorsResponse = {
    operators: Operator[]
}
export async function getAllOperator(): Promise<GetAllOperatorsResponse> {
    const response = await baseAPI.get('/v1/operator')
    return response.data;
}

type CreateOperatorProps = {
    username: string;
    password: string;
    name: string;
    email?: string;
    permissions: LolaPermissions[]
}
export async function createOperator(props: CreateOperatorProps): Promise<Operator> {
    const response = await baseAPI.post('/v1/operator', props)
    return response.data;
}

type OperatorByIdResponse = {
    operator: Operator
}
export async function getOperatorById(operatorId: string): Promise<OperatorByIdResponse> {
    const response = await baseAPI.get('/v1/operator/' + operatorId);
    return response.data;
}

type UpdateOperatorDTO = {
    name: string;
    email: Nullable<string>;
    permissions: LolaPermissions[]
}
export async function updateOperator(operatorId: string, payload: UpdateOperatorDTO): Promise<Operator> {
    const response = await baseAPI.patch('/v1/operator/' + operatorId, payload)
    return response.data;
}

export async function deleteOperator(operatorId: string): Promise<void> {
    const response = await baseAPI.delete('/v1/operator/' + operatorId)
    return response.data;
}

type GetOperatorSessionsResponse = {
    sessions: Session[]
}
export async function getOperatorSessions(): Promise<GetOperatorSessionsResponse> {
    const response = await baseAPI.get('/v1/auth/sessions')
    return response.data;
}

export async function disableOperatorSession(sessionId: string): Promise<void> {
    const response = await baseAPI.delete('/v1/auth/session/' + sessionId)
    return response.data;
}