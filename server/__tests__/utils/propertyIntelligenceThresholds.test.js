describe('Property Intelligence Threshold Configuration', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.INTEL_FRAUD_MEDIUM_THRESHOLD;
    delete process.env.INTEL_FRAUD_HIGH_THRESHOLD;
    delete process.env.INTEL_RISK_MEDIUM_THRESHOLD;
    delete process.env.INTEL_RISK_HIGH_THRESHOLD;
  });

  it('uses env-based fraud thresholds in moderation', () => {
    process.env.INTEL_FRAUD_MEDIUM_THRESHOLD = '10';
    process.env.INTEL_FRAUD_HIGH_THRESHOLD = '20';

    const intelligence = require('../../utils/propertyIntelligence');
    const result = intelligence.analyzeTextForFraud('https://spam.test click here');

    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.riskLevel).toBe('High');
  });

  it('uses env-based risk thresholds in rental risk classification', () => {
    process.env.INTEL_RISK_MEDIUM_THRESHOLD = '5';
    process.env.INTEL_RISK_HIGH_THRESHOLD = '10';

    const intelligence = require('../../utils/propertyIntelligence');
    const result = intelligence.computeRentalRisk({ unpaidCount: 1, rejectedCount: 0, pendingCount: 0, occupancyRatio: 0.8 });

    expect(result.score).toBeGreaterThan(10);
    expect(result.level).toBe('High');
  });
});
