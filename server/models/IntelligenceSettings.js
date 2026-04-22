const mongoose = require('mongoose');

const thresholdsSchema = new mongoose.Schema(
  {
    fraud: {
      medium: { type: Number },
      high: { type: Number },
    },
    risk: {
      medium: { type: Number },
      high: { type: Number },
    },
    pricing: {
      lowOccupancy: { type: Number },
      highOccupancy: { type: Number },
      strongQuality: { type: Number },
      weakQuality: { type: Number },
      strongCommute: { type: Number },
      weakCommute: { type: Number },
    },
    quality: {
      gradeA: { type: Number },
      gradeB: { type: Number },
      gradeC: { type: Number },
    },
  },
  { _id: false }
);

const intelligenceSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    thresholds: {
      type: thresholdsSchema,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IntelligenceSettings', intelligenceSettingsSchema);
