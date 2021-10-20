module.exports = {
    displayName: "testing-workflows",
    preset: "../../../jest.preset.js",
    setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
    globals: {
        "ts-jest": {
            stringifyContentPathRegex: "\\.(html|svg)$",

            tsconfig: "<rootDir>/tsconfig.spec.json",
        },
    },
    coverageDirectory: "../../../coverage/libs/testing/workflows",

    transform: { "^.+\\.(ts|js|html)$": "jest-preset-angular" },
    snapshotSerializers: [
        "jest-preset-angular/build/serializers/no-ng-attributes",
        "jest-preset-angular/build/serializers/ng-snapshot",
        "jest-preset-angular/build/serializers/html-comment",
    ],
};
