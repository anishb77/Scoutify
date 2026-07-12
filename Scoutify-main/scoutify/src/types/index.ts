export interface ScoutifyInputData {
  position: string;
  heightInches: number;
  weight: number;
  fortyYardTime: number;
  vertical: number;
  benchPress: number;
  broadJump: number;
  threeConeTime: number;
  shuttleTime: number;
}

export interface AttributeGrades {
  [attributeName: string]: number;
}

export interface PlayerProfile {
  name: string;
  height: string;
  weight: string;
  school: string;
  speed: number;
  explosiveness: number;
  power: number;
  agility: number;
  [dynamicMetric: string]: string | number;
}

export interface ScoutifyApiResponse {
  grades: AttributeGrades;
  radarData: {
    user: {
      speed: number;
      explosiveness: number;
      power: number;
      agility: number;
    };
    comparablePlayer: {
      name: string;
      speed: number;
      explosiveness: number;
      power: number;
      agility: number;
    };
  };
  similarPlayers: PlayerProfile[];
}
