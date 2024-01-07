import type NodeCG from '@nodecg/types';

// Make typescript believe images can be included as Parcel expects
declare module "*.svg" {
    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    const src: string;
    export default src;
}

declare module "*.png" {
    export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    const src: string;
    export default src;
}

declare const nodecg: NodeCG.ClientAPI;