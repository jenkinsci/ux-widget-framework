/**
 * Propagates widget dev package.json into widget dist package.json
 * 
 * We want to be publishing widgets from `/dist` rather than the root, so we can keep published 
 * modules as minimal as possible.
 * 
 * TODO: Should be a gulp plugin
 */

import * as fs from './fsPromises';

export interface Options {
    scripts: 'none' | 'blockPublish'
}

export const defaultOptions: Options = {
   scripts: 'none'
};

// TODO: Clean up the types up in this mofo

export function createDistPackage(sourceFilePath: string, destFilePath: string, options?:Options) {
    const finalOptions = {...defaultOptions, ...options};
    return fs.readFile(sourceFilePath, 'utf8')
        .then((src: string) => JSON.parse(src))
        .then((packageDetails: any) => processPackage(packageDetails, finalOptions))
        .then((obj: any) => JSON.stringify(obj, null, 2))
        .then((src: string) => fs.writeFile(destFilePath, src, 'utf8'));
}

function processPackage(packageDetailsXX:any, options:Options) {

    const newPackageDetails = {...packageDetailsXX};

    // Delete some things unneeded for the distributed artefact
    delete newPackageDetails.devDependencies;

    switch (options.scripts) {
        case "none":
            delete newPackageDetails.scripts;
            break;
        case "blockPublish":
            newPackageDetails.scripts = {
                prepublishOnly: 'echo "Publish currently blocked by build" && exit 1'
            };
            break;
        default:
            // Compile error if inexhaustive
            const ignored:never = options.scripts;
    }

    // Tweak some settings
    if (newPackageDetails.main) {
        newPackageDetails.main = newPackageDetails.main.replace('dist/','');
    }
    if (newPackageDetails.types) {
        newPackageDetails.types = newPackageDetails.types.replace('dist/','');
    }

    // Tweak relative local deps 
    for (const key in newPackageDetails.dependencies) {
        // TODO: This is awful, I need a better solution than this :'(
        let value = newPackageDetails.dependencies[key];
        value = value.replace(/^file:\.\.\//, 'file:../../');
        newPackageDetails.dependencies[key] = value;
    }

    return newPackageDetails;
}

