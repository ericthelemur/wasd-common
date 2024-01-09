import {
    DragDropContext, DragDropContextProps, Draggable, DraggableProvided, Droppable
} from 'react-beautiful-dnd';
import { GripVertical, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import add from '../assets/add.svg';

function DnDTransitionItem(index: number, id: string, content: (provided: DraggableProvided) => JSX.Element) {
    return <CSSTransition timeout={500} key={id} classNames="item">
        <Draggable key={id} draggableId={id} index={index}>
            {content}
        </Draggable>
    </CSSTransition>
}

interface DnDBase<T> {
    id: string;
    data: T[];
    ids: string[];
    type?: string;
}

interface DndTransitionsListProps<T> extends DnDBase<T> {
    content: (index: number, id: string, item: T, provided: DraggableProvided) => JSX.Element;
}

export function DnDTransitionsList<T>({ id, ids, data, content, type }: DndTransitionsListProps<T>) {
    return (
        <Droppable droppableId={id} type={type}>
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                    <TransitionGroup className='pool vstack'>
                        {data.map((d, i) => DnDTransitionItem(i, ids[i], (p) => content(i, ids[i], d, p)))}
                        {provided.placeholder}
                    </TransitionGroup>
                </div>
            )}
        </Droppable>
    )
}


type TDnDAction<T> = ((gid: string, index: number, id: string | null, before: T | null) => void);

interface DnDGroupListProps<T> extends DnDBase<T> {
    functions: {
        content: (gid: string, index: number, id: string, item: T) => JSX.Element;
        onHandle?: TDnDAction<T>;
        onRemove?: TDnDAction<T>;
    }
}

export function InsertHandle(props: { onClick: () => void }) {
    return (
        <div className="addBtn" onClick={props.onClick}>
            <img className="addIcon" src={add} />
        </div>
    )
}

export function DnDGroupList<T>(props: DnDGroupListProps<T>) {
    const newContent = (index: number, id: string, item: T, provided: DraggableProvided) => {
        return <InputGroup className="m-1" ref={provided.innerRef} {...provided.draggableProps}>
            <div className="btn btn-outline-secondary grip" {...provided.dragHandleProps}><GripVertical /></div>
            {props.functions.onHandle && <InsertHandle
                onClick={() => props.functions.onHandle!(props.id, index, id, item)} />}
            {props.functions.content(props.id, index, `${props.id}::${id}`, item)}
            {props.functions.onRemove && <Button variant="outline-secondary"
                onClick={() => props.functions.onRemove!(props.id, index, id, item)}><XLg /></Button>}
        </InputGroup>
    }
    return <Stack className="m-2">
        <DnDTransitionsList {...props} content={newContent} />
        {props.functions.onHandle && <div className="position-relative mt-2">
            <InsertHandle onClick={() => props.functions.onHandle!(props.id, props.data.length, null, null)} />
        </div>}
    </Stack>
}

export interface GroupProps<T> extends DnDBase<T> {
    title?: string;
    original: string[];
}
type TDnDGroupAction<T> = ((gid: string, group: GroupProps<T>, index: number, id: string | null, item: T | null) => void);

interface GroupDnDProps<T> {
    group: GroupProps<T>;
    functions: {
        content: (gid: string, group: GroupProps<T>, index: number, id: string, item: T) => JSX.Element;
        onHandle?: TDnDGroupAction<T>;
        onRemove?: TDnDGroupAction<T>;
    }
}

function GroupDnD<T>(props: GroupDnDProps<T>) {
    const functions: DnDGroupListProps<T>["functions"] = { content: (gid: string, index: number, id: string, item: T) => props.functions.content(gid, props.group, index, id, item) }
    if (props.functions.onHandle) functions.onHandle = (gid: string, index: number, id: string | null, item: T | null) => props.functions.onHandle!(gid, props.group, index, id, item);
    if (props.functions.onRemove) functions.onRemove = (gid: string, index: number, id: string | null, item: T | null) => props.functions.onRemove!(gid, props.group, index, id, item);

    return <div className="dnd-group">
        {props.group.title && <h2>{props.group.title}</h2>}
        <DnDGroupList {...props.group} functions={functions} />
    </div>
}

interface ColProps<T> {
    cid: string;
    title?: string;
    groups: GroupProps<T>[];
    functions: GroupDnDProps<T>["functions"];
}

function ColDnD<T>(props: ColProps<T>) {
    return <div className="dnd-col w-50 h-100 overflow-auto">
        {props.title && <h2>{props.title}</h2>}
        {props.groups.map((g) => <GroupDnD key={g.id} group={g} functions={props.functions} />)}
    </div>
}

interface TwoColProps<T> {
    left: ColProps<T>;
    right: ColProps<T>;

    context?: DragDropContextProps;
    onDragEnd: DragDropContextProps["onDragEnd"];
}

export function TwoColDnD<T>(props: TwoColProps<T>) {
    return <div className="fill">
        <DragDropContext {...(props.context ?? {})} onDragEnd={props.onDragEnd}>
            <ColDnD {...props.left} />
            <ColDnD {...props.right} />
        </DragDropContext>
    </div>
}