export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER';
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserResponse;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: { field: string; message: string }[];
}
