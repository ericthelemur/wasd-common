/**
 * Parcel build script
 * See https://parceljs.org/features/parcel-api/ for more info
 */

// Native
import { fileURLToPath } from 'url';
import { argv } from 'process';
import { execSync } from 'child_process';

// Packages
import { glob } from 'glob';
import { Parcel } from '@parcel/core';
import chokidar from 'chokidar';
import { rimraf } from 'rimraf';

// Ours
import debounce from './debounce.mjs';


const name = argv[2];

// Parse cmd line flags
function argParse(def) {
  const buildAll = argv.includes('--all');
  const buildDefault = def || argv.includes('--default');
  const cleanOnly = argv.includes("--clean-only");
  const buildBrowser = argv.includes('--browser');
  const args = {
    extension: argv.includes('--extension') || buildAll || buildDefault,
    dashboard: argv.includes('--dashboard') || buildAll || buildDefault || buildBrowser,
    graphics: argv.includes('--graphics') || buildAll || buildDefault || buildBrowser,
    schemas: argv.includes('--schemas') || argv.includes('--types') || buildAll,
  }
  // If none provided, recall taking default
  if (!Object.values(args).find(v => v)) return argParse(true);

  const watch = argv.includes('--watch');
  const clean = argv.includes('--clean');
  // Log what is being built
  const selected = Object.entries(args).filter(([k, v]) => v).map(([k, v]) => k).join(", ");
  console.log(cleanOnly ? "Cleaning" : ((clean ? "Clean " : "") + (watch ? "Watching" : "Building")), selected);

  return { ...args, watch: watch, clean: clean, all: buildAll, cleanOnly: cleanOnly };
}

const build = argParse(false);

// Clean files, exit if clean only
if (build.cleanOnly || build.clean) {
  const promises = [];
  if (build.extension) promises.push(rimraf("extension"));
  if (build.dashboard) promises.push(rimraf("dashboard"));
  if (build.graphics) promises.push(rimraf("graphics"));
  if (build.schemas) promises.push(rimraf("src/types/schemas"));
  if (build.all) promises.push(rimraf(".parcel-cache"));
  await Promise.all(promises);
  console.log("Clean complete");
  if (build.cleanOnly) process.exit(0);
}


const bundlers = new Set();
const commonBrowserTargetProps = {
  engines: {
    browsers: ['last 5 Chrome versions'],
  },
  context: 'browser',
};

if (build.dashboard) {
  bundlers.add(
    new Parcel({
      entries: glob.sync('src/dashboard/**/*.html'),
      targets: {
        default: {
          ...commonBrowserTargetProps,
          distDir: 'dashboard',
          publicUrl: `/bundles/${name}/dashboard`,
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

if (build.graphics) {
  bundlers.add(
    new Parcel({
      entries: glob.sync('src/graphics/**/*.html'),
      targets: {
        default: {
          ...commonBrowserTargetProps,
          distDir: 'graphics',
          publicUrl: `/bundles/${name}/graphics`,
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

if (build.extension) {
  bundlers.add(
    new Parcel({
      entries: 'src/extension/index.extension.ts',
      targets: {
        default: {
          context: 'node',
          distDir: 'extension',
          distEntry: "index.js"
        },
      },
      defaultConfig: '@parcel/config-default',
      additionalReporters: [
        {
          packageName: '@parcel/reporter-cli',
          resolveFrom: fileURLToPath(import.meta.url),
        },
      ],
      validators: {
        "*.{ts,tsx}": ["@parcel/validator-typescript"]
      }
    }),
  );
}

try {
  if (build.watch) {
    if (build.schemas) {
      watchSchemas();
    }

    const watchPromises = [];
    for (const bundler of bundlers.values()) {
      watchPromises.push(
        bundler.watch((err) => {
          if (err) {
            // fatal error
            throw err;
          }
        }),
      );
    }

    await Promise.all(watchPromises);
  } else {
    if (build.schemas) {
      doBuildSchemas();
    }

    const buildPromises = [];
    for (const bundler of bundlers.values()) {
      buildPromises.push(bundler.run());
    }

    await Promise.all(buildPromises);
  }

  console.log('Bundle build completed successfully');
} catch (_) {
  // the reporter-cli package will handle printing errors to the user
  process.exit(1);
}

function doBuildSchemas() {
  execSync('npm run types');
  process.stdout.write(`🔧 Built Replicant schema types!\n`);
}

function watchSchemas() {
  chokidar.watch('schemas/**/*.json').on('all', () => {
    debounce('compileSchemas', doBuildSchemas);
  });
}