import { apiClient } from '../../../lib/api.js';
import type { ApiResponse } from '../../../types/api.types.js';
import type {
  Label,
  LabelWithCount,
  CreateLabelInput,
  UpdateLabelInput,
  LabelQueryParams,
} from '../types/label.types.js';

export async function getLabels(params?: LabelQueryParams): Promise<LabelWithCount[]> {
  const response = await apiClient.get<ApiResponse<LabelWithCount[]>>('/labels', { params });
  return response.data.data;
}

export async function getLabelById(id: number): Promise<Label> {
  const response = await apiClient.get<ApiResponse<Label>>(`/labels/${id}`);
  return response.data.data;
}

export async function createLabel(input: CreateLabelInput): Promise<Label> {
  const response = await apiClient.post<ApiResponse<Label>>('/labels', input);
  return response.data.data;
}

export async function updateLabel(id: number, input: UpdateLabelInput): Promise<Label> {
  const response = await apiClient.put<ApiResponse<Label>>(`/labels/${id}`, input);
  return response.data.data;
}

export async function deleteLabel(id: number): Promise<void> {
  await apiClient.delete(`/labels/${id}`);
}
