
export interface WidgetProps {
    // IMPORTANT: Everything here needs to be in CommonWidgetPropNames!
    assetURLBase?: string;
    resourceBundle?: any;
}

export const CommonWidgetPropNames:Array<keyof WidgetProps> = [
    // IMPORTANT: Everything in WidgetProps needs to be in here!
    // TODO: Cook up some unit tests or something to ensure this!
    'assetURLBase',
    'resourceBundle'
];

export interface UXWidget<T extends WidgetProps> {
    props: T;
}

export interface WidgetDescription {
    /**
     * The name of the Widget's React Component class
     */
    widgetClass: string;

    /**
     * Names of the React properties for Widget Events
     */
    widgetEvents: Array<string>;

    /**
     * Names of the React properties for Host Events
     */
    hostEvents: Array<string>;

    /**
     * Names of the React properties for Data Model objects
     */
    models: Array<string>;

    /**
     * Names of the React properties for required Service objects
     */
    services: Array<string>;

    // /**
    //  * Names of the React properties for static assets
    //  */
    // assets: Array<string>;
}

function ensureArray<T>(input:any):Array<T> {
    if (Array.isArray(input)) {
        return input;
    }
    return [];
}

/**
 * Validate and coerce a JS object into a WidgetDescription, or throw
 */
export function parseWidgetDescription(input: any): WidgetDescription {
    // TODO: Change out that input: any for input: unknown once we go TS3

    if (typeof input.widgetClass !== 'string') {
        throw new Error('parseWidgetDescription: input missing widgetClass prop');
    }

    const widgetClass:string = input.widgetClass;
    const widgetEvents:Array<string> = ensureArray<string>(input.widgetEvents);
    const hostEvents:Array<string> = ensureArray<string>(input.hostEvents);
    const models:Array<string> = ensureArray<string>(input.models);
    const services:Array<string> = ensureArray<string>(input.services);

    return {
        widgetClass,
        widgetEvents,
        hostEvents,
        models,
        services
    } as WidgetDescription;
}
