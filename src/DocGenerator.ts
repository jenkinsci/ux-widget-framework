import { Reflector, ClassMirror, TypeMirror, InterfaceMirror } from "./reflector/Reflector";
import { WidgetDescription, CommonWidgetPropNames } from "./WidgetComponent";

/**
 * Interface for widget documentation generation
 */
export interface DocGenerator {
    readonly warnings: Array<string>;

    debug(): string;

    /**
     * Generate the whole document as a string
     */
    generate(): string;
}

export function basicDocGenerator(reflector: Reflector, widgetDescription: WidgetDescription): DocGenerator {
    const r = new BasicDocGenerator(reflector, widgetDescription);
    r.process();
    return r;
}

/**
 * Shoddy implementation for PoC purposes. Spits out some basic documentation as MarkDown
 */
class BasicDocGenerator implements DocGenerator {
    reflector: Reflector;
    widgetDescription: WidgetDescription;
    warnings: Array<string> = [];

    widgetClass?: ClassMirror;
    widgetPropNames: string[] = [];

    constructor(reflector: Reflector, widgetDescription: WidgetDescription) {
        this.reflector = reflector;
        this.widgetDescription = widgetDescription;
    }

    process() {
        const { reflector, widgetDescription } = this;

        const warnings: Array<string> = [];

        //--------------------------------------
        //  Get some initial reflection data
        //--------------------------------------

        const widgetClassName = widgetDescription.widgetClass;
        const widgetClass = reflector.describeClass(widgetClassName);
        this.widgetClass = widgetClass;

        const props = widgetClass.describeProperty('props');

        const propsType = reflector.describeTypeById(props.getTypeId());

        if (!propsType.isComplex) {
            throw new Error(`Widget.props is not a complex (interface) type`);
        }

        const widgetPropNames = (propsType as InterfaceMirror).propertyNames();
        this.widgetPropNames = widgetPropNames;

        //--------------------------------------
        //  Compare actual widget props to declared props in JSON
        //--------------------------------------

        const unIdentifiedPropNames = new Set(widgetPropNames);
        const allDescriptionProps = [
            ...widgetDescription.hostEvents,
            ...widgetDescription.widgetEvents,
            ...widgetDescription.models,
            ...widgetDescription.services
        ];

        const badDescriptionProps: Array<string> = [];
        for (const name of allDescriptionProps) {
            if (unIdentifiedPropNames.has(name)) {
                unIdentifiedPropNames.delete(name);
            } else {
                badDescriptionProps.push(
                    `Property "${name}" listed in WidgetDescription but not found in ${widgetClassName}.props`
                );
            }
        }

        if (badDescriptionProps.length) {
            throw new Error('Cannot process WidgetDescription:\n * ' + badDescriptionProps.join('\n * '));
        }

        for (const name of CommonWidgetPropNames) {
            // Common widget props defined in WidgetComponent do not need to be specified in WidgetDescription
            unIdentifiedPropNames.delete(name);
        }

        for (const name of unIdentifiedPropNames) {
            warnings.push(`Widget property "${name}" not included in WidgetDescription`);
        }

        this.warnings = warnings;
    }

    generate(): string {
        let sections: Array<string> = [];
        const desc = this.widgetDescription;

        if (this.widgetClass) {
            // Anchor, header, comments
            sections.push(this.genInterfaceSection(this.widgetClass));
           
            // Prop categories
            if (desc.models.length) {
                sections.push(this.genPropCategorySection('Model Properties', desc.models));
            }

            if (desc.hostEvents.length) {
                sections.push(this.genPropCategorySection('Host Application Events', desc.hostEvents));
            }

            if (desc.widgetEvents.length) {
                sections.push(this.genPropCategorySection('Widget Events', desc.widgetEvents));
            }

            if (desc.services.length) {
                sections.push(this.genPropCategorySection('Service Object Properties', desc.services));
            }
        }

        return sections.join('\n\n');
    }

    private genInterfaceSection(mirror: InterfaceMirror):string {
        let sections: Array<string> = [];

        sections.push(this.genTypeAnchor(mirror));
        sections.push(this.genTypeHeader(mirror));

        if (mirror.hasComment) {
            const short = mirror.commentShortText;
            const long = mirror.commentLongText;

            sections.push(this.genCommentHeader(short));
            if (long.length) {
                sections.push(this.genCommentBody(long));
            }
        }

        //return sections.join('\n\n');
    }

    private genTypeAnchor(mirror: TypeMirror):string {
        return `<a name="${mirror.name}-${mirror.id}"></a>`;
    }

    private genTypeHeader(mirror: TypeMirror):string {
        return `## ${mirror.kindString} ${mirror.name}`;
    }

    private genCommentHeader(comment:string):string {
        return `### ${comment}`;
    }

    private genCommentBody(comment:string):string {
        return comment;
    }

    genPropCategorySection(categoryLabel:string, propNames: Array<string>):string {
        let lines:Array<string> = [];

        lines.push(`#### ${categoryLabel}`);
        lines.push('');
        lines.push('| Name | Type |');
        lines.push('---------------');

        const sorted = propNames.concat().sort();
        for (const name of sorted) {
            lines.push(`| ${name} | FooBar |`);
        }

        return lines.join('\n');
    }

    debug(): string {

        let result = '# BasicDocGenerator\n\n';

        result += 'Widget Properties:\n';
        for (const propName of this.widgetPropNames) {
            result += ` * ${propName}\n`;
        }
        result += '\n';

        // if (this.warnings.length === 0) {
        //     result += 'No warnings.';
        // } else {
        //     result += `${this.warnings.length} warnings:\n * `
        //     result += this.warnings.join('\n * ');
        // }
        // result += '\n';

        return result;
    }
}