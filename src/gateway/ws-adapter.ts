import { HermesGatewayError } from './rest-adapter';

export function createDashboardWebSocketStub(): never {
  throw new HermesGatewayError(
    'configuration',
    'Remote dashboard WebSocket mode is not implemented yet; use Local API or Remote API fallback.'
  );
}
