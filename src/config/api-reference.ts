import type { ApiReferenceConfig } from '@/lib/openapi/types'

export const apiReferenceConfig: ApiReferenceConfig = {
  defaultSpecId: 'plant-store',
  specs: [
    {
      id: 'plant-store',
      label: 'Plant Store API',
      description: 'Sample spec that demonstrates automated API reference generation.',
      version: 'v1',
      source: {
        type: 'file',
        path: 'openapi.yaml',
      },
      tagsOrder: ['plants', 'webhooks'],
      defaultGroup: 'Core',
      webhookGroup: 'Webhooks',
      operationOverrides: {
        'GET /plants': {
          title: 'List plants',
          description: 'Fetch the plants the authenticated user can access.',
          badge: 'Stable',
        },
        'POST /plants': {
          title: 'Create plant',
          description: 'Create a plant entry and return the canonical record.',
        },
        'DELETE /plants/{id}': {
          title: 'Delete plant',
          description: 'Remove a plant using its numeric identifier.',
        },
        'WEBHOOK POST /plant/webhook': {
          group: 'Webhooks',
          badge: 'Webhook',
        },
      },
    },
  ],
}

