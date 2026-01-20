export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function readBodyText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return response.statusText;
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readBodyText(response));
  }

  return (await response.json()) as T;
}

export async function apiText(
  path: string,
  init: RequestInit = {},
): Promise<string> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
  });

  const body = await readBodyText(response);
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }
  return body;
}

export async function apiPostJson(
  path: string,
  body: unknown,
  init: RequestInit = {},
): Promise<string> {
  return apiText(path, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

