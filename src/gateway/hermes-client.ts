import type {
  CapabilityInfo,
  HealthStatus,
  ModelInfo,
  ProfileInfo,
  SessionInfo,
  SkillInfo
} from '../shared/types';

export interface HermesGatewayClient {
  health(): Promise<HealthStatus>;
  listModels(): Promise<ModelInfo[]>;
  listSessions(): Promise<SessionInfo[]>;
  listSkills(): Promise<SkillInfo[]>;
  listProfiles(): Promise<ProfileInfo[]>;
  listCapabilities(): Promise<CapabilityInfo>;
}
