import React from 'react';
import {
  GraduationCap, Briefcase, Home, Heart, Users, CheckSquare, Dumbbell, BookOpen,
  ShoppingCart, Utensils, Plane, PiggyBank, Baby, PawPrint, Stethoscope, Music,
  Wallet, Circle, Star, Target, Zap, Coffee, Car, Gift, Leaf, Sun, Moon, Clock
} from 'lucide-react';

const map = {
  GraduationCap, Briefcase, Home, Heart, Users, CheckSquare, Dumbbell, BookOpen,
  ShoppingCart, Utensils, Plane, PiggyBank, Baby, PawPrint, Stethoscope, Music,
  Wallet, Circle, Star, Target, Zap, Coffee, Car, Gift, Leaf, Sun, Moon, Clock
};

export const ICON_OPTIONS = Object.keys(map);

export const getIcon = (name) => map[name] || Circle;