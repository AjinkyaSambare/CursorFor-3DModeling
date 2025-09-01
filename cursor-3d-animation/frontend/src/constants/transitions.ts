import { ArrowRight, Zap, Expand, RotateCw } from 'lucide-react';

export interface TransitionType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  duration: number; // Default duration in seconds
}

export const TRANSITION_TYPES: TransitionType[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No transition',
    icon: ArrowRight,
    duration: 0,
  },
  {
    id: 'fade',
    name: 'Fade',
    description: 'Fade out/in transition',
    icon: Zap,
    duration: 0.5,
  },
  {
    id: 'slide',
    name: 'Slide',
    description: 'Slide transition',
    icon: ArrowRight,
    duration: 0.8,
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Zoom in/out transition',
    icon: Expand,
    duration: 0.6,
  },
  {
    id: 'spin',
    name: 'Spin',
    description: 'Rotation transition',
    icon: RotateCw,
    duration: 0.7,
  },
];