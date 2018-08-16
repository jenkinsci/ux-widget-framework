// Quick re-impl of (the subset we care about of) fs.promises from node 10

import * as fs from 'fs';

// TODO: use better types instead of all these anys

export function readFile(sourceFilePath:string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(sourceFilePath, options, (err:any, data:any) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        })
    });
}

export function writeFile(destFilePath:string, data:any, options:any): Promise<any> {
    return new Promise((resolve, reject) => {
        fs.writeFile(destFilePath, data, options, (err:any) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        })

    });
}

