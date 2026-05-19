/** Types generated for queries found in "sql/queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'InsertCanvas' parameters type */
export interface IInsertCanvasParams {
  blockHeight: number;
  maxPaints: number;
  owner: string;
  paintCount: number;
  parentId?: number | null | void;
}

/** 'InsertCanvas' return type */
export interface IInsertCanvasResult {
  id: number;
}

/** 'InsertCanvas' query type */
export interface IInsertCanvasQuery {
  params: IInsertCanvasParams;
  result: IInsertCanvasResult;
}

const insertCanvasIR: any = {"usedParamSet":{"owner":true,"parentId":true,"paintCount":true,"maxPaints":true,"blockHeight":true},"params":[{"name":"owner","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":93}]},{"name":"parentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":104}]},{"name":"paintCount","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":118}]},{"name":"maxPaints","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":131}]},{"name":"blockHeight","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":146}]}],"statement":"INSERT INTO canvases (owner, parent_id, paint_count, max_paints, block_height)\nVALUES (:owner!, :parentId, :paintCount!, :maxPaints!, :blockHeight!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO canvases (owner, parent_id, paint_count, max_paints, block_height)
 * VALUES (:owner!, :parentId, :paintCount!, :maxPaints!, :blockHeight!)
 * RETURNING id
 * ```
 */
export const insertCanvas = new PreparedQuery<IInsertCanvasParams,IInsertCanvasResult>(insertCanvasIR);


/** 'InsertPaint' parameters type */
export interface IInsertPaintParams {
  blockHeight: number;
  canvasId: number;
  color: string;
  painter: string;
  paintIndex: number;
}

/** 'InsertPaint' return type */
export interface IInsertPaintResult {
  id: number;
}

/** 'InsertPaint' query type */
export interface IInsertPaintQuery {
  params: IInsertPaintParams;
  result: IInsertPaintResult;
}

const insertPaintIR: any = {"usedParamSet":{"canvasId":true,"painter":true,"color":true,"paintIndex":true,"blockHeight":true},"params":[{"name":"canvasId","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":91}]},{"name":"painter","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":102}]},{"name":"color","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":111}]},{"name":"paintIndex","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":125}]},{"name":"blockHeight","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140}]}],"statement":"INSERT INTO paints (canvas_id, painter, color, paint_index, block_height)\nVALUES (:canvasId!, :painter!, :color!, :paintIndex!, :blockHeight!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO paints (canvas_id, painter, color, paint_index, block_height)
 * VALUES (:canvasId!, :painter!, :color!, :paintIndex!, :blockHeight!)
 * RETURNING id
 * ```
 */
export const insertPaint = new PreparedQuery<IInsertPaintParams,IInsertPaintResult>(insertPaintIR);


/** 'IncrementCanvasPaintCount' parameters type */
export interface IIncrementCanvasPaintCountParams {
  canvasId: number;
}

/** 'IncrementCanvasPaintCount' return type */
export interface IIncrementCanvasPaintCountResult {
  filled: boolean;
  max_paints: number;
  paint_count: number;
}

/** 'IncrementCanvasPaintCount' query type */
export interface IIncrementCanvasPaintCountQuery {
  params: IIncrementCanvasPaintCountParams;
  result: IIncrementCanvasPaintCountResult;
}

const incrementCanvasPaintCountIR: any = {"usedParamSet":{"canvasId":true},"params":[{"name":"canvasId","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":116}]}],"statement":"UPDATE canvases\nSET paint_count = paint_count + 1,\n    filled = (paint_count + 1) >= max_paints\nWHERE id = :canvasId!\nRETURNING paint_count, filled, max_paints"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE canvases
 * SET paint_count = paint_count + 1,
 *     filled = (paint_count + 1) >= max_paints
 * WHERE id = :canvasId!
 * RETURNING paint_count, filled, max_paints
 * ```
 */
export const incrementCanvasPaintCount = new PreparedQuery<IIncrementCanvasPaintCountParams,IIncrementCanvasPaintCountResult>(incrementCanvasPaintCountIR);


/** 'GetCanvasById' parameters type */
export interface IGetCanvasByIdParams {
  canvasId: number;
}

/** 'GetCanvasById' return type */
export interface IGetCanvasByIdResult {
  block_height: number;
  created_at: Date;
  filled: boolean;
  id: number;
  max_paints: number;
  owner: string;
  paint_count: number;
  parent_id: number | null;
}

/** 'GetCanvasById' query type */
export interface IGetCanvasByIdQuery {
  params: IGetCanvasByIdParams;
  result: IGetCanvasByIdResult;
}

const getCanvasByIdIR: any = {"usedParamSet":{"canvasId":true},"params":[{"name":"canvasId","required":true,"transform":{"type":"scalar"},"locs":[{"a":34,"b":43}]}],"statement":"SELECT * FROM canvases WHERE id = :canvasId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM canvases WHERE id = :canvasId!
 * ```
 */
export const getCanvasById = new PreparedQuery<IGetCanvasByIdParams,IGetCanvasByIdResult>(getCanvasByIdIR);


/** 'GetCanvasPaints' parameters type */
export interface IGetCanvasPaintsParams {
  canvasId: number;
}

/** 'GetCanvasPaints' return type */
export interface IGetCanvasPaintsResult {
  block_height: number;
  canvas_id: number;
  color: string;
  id: number;
  paint_index: number;
  painter: string;
}

/** 'GetCanvasPaints' query type */
export interface IGetCanvasPaintsQuery {
  params: IGetCanvasPaintsParams;
  result: IGetCanvasPaintsResult;
}

const getCanvasPaintsIR: any = {"usedParamSet":{"canvasId":true},"params":[{"name":"canvasId","required":true,"transform":{"type":"scalar"},"locs":[{"a":39,"b":48}]}],"statement":"SELECT * FROM paints WHERE canvas_id = :canvasId! ORDER BY paint_index ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM paints WHERE canvas_id = :canvasId! ORDER BY paint_index ASC
 * ```
 */
export const getCanvasPaints = new PreparedQuery<IGetCanvasPaintsParams,IGetCanvasPaintsResult>(getCanvasPaintsIR);


/** 'ListUnfilledCanvases' parameters type */
export interface IListUnfilledCanvasesParams {
  limit: NumberOrString;
}

/** 'ListUnfilledCanvases' return type */
export interface IListUnfilledCanvasesResult {
  block_height: number;
  created_at: Date;
  filled: boolean;
  id: number;
  max_paints: number;
  owner: string;
  paint_count: number;
  parent_id: number | null;
}

/** 'ListUnfilledCanvases' query type */
export interface IListUnfilledCanvasesQuery {
  params: IListUnfilledCanvasesParams;
  result: IListUnfilledCanvasesResult;
}

const listUnfilledCanvasesIR: any = {"usedParamSet":{"limit":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":81}]}],"statement":"SELECT * FROM canvases WHERE filled = FALSE ORDER BY created_at DESC LIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM canvases WHERE filled = FALSE ORDER BY created_at DESC LIMIT :limit!
 * ```
 */
export const listUnfilledCanvases = new PreparedQuery<IListUnfilledCanvasesParams,IListUnfilledCanvasesResult>(listUnfilledCanvasesIR);


/** 'ListCanvasesByOwner' parameters type */
export interface IListCanvasesByOwnerParams {
  limit: NumberOrString;
  owner: string;
}

/** 'ListCanvasesByOwner' return type */
export interface IListCanvasesByOwnerResult {
  block_height: number;
  created_at: Date;
  filled: boolean;
  id: number;
  max_paints: number;
  owner: string;
  paint_count: number;
  parent_id: number | null;
}

/** 'ListCanvasesByOwner' query type */
export interface IListCanvasesByOwnerQuery {
  params: IListCanvasesByOwnerParams;
  result: IListCanvasesByOwnerResult;
}

const listCanvasesByOwnerIR: any = {"usedParamSet":{"owner":true,"limit":true},"params":[{"name":"owner","required":true,"transform":{"type":"scalar"},"locs":[{"a":37,"b":43}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":82}]}],"statement":"SELECT * FROM canvases WHERE owner = :owner! ORDER BY created_at DESC LIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM canvases WHERE owner = :owner! ORDER BY created_at DESC LIMIT :limit!
 * ```
 */
export const listCanvasesByOwner = new PreparedQuery<IListCanvasesByOwnerParams,IListCanvasesByOwnerResult>(listCanvasesByOwnerIR);


/** 'CountCanvases' parameters type */
export type ICountCanvasesParams = void;

/** 'CountCanvases' return type */
export interface ICountCanvasesResult {
  total: number | null;
}

/** 'CountCanvases' query type */
export interface ICountCanvasesQuery {
  params: ICountCanvasesParams;
  result: ICountCanvasesResult;
}

const countCanvasesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT COUNT(*)::INTEGER AS total FROM canvases"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::INTEGER AS total FROM canvases
 * ```
 */
export const countCanvases = new PreparedQuery<ICountCanvasesParams,ICountCanvasesResult>(countCanvasesIR);


/** 'UpsertReward' parameters type */
export interface IUpsertRewardParams {
  balanceWei: NumberOrString;
  blockHeight: number;
  owner: string;
}

/** 'UpsertReward' return type */
export type IUpsertRewardResult = void;

/** 'UpsertReward' query type */
export interface IUpsertRewardQuery {
  params: IUpsertRewardParams;
  result: IUpsertRewardResult;
}

const upsertRewardIR: any = {"usedParamSet":{"owner":true,"balanceWei":true,"blockHeight":true},"params":[{"name":"owner","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":70}]},{"name":"balanceWei","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":84}]},{"name":"blockHeight","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":99}]}],"statement":"INSERT INTO rewards (owner, balance_wei, updated_block)\nVALUES (:owner!, :balanceWei!, :blockHeight!)\nON CONFLICT (owner) DO UPDATE\n  SET balance_wei = rewards.balance_wei + EXCLUDED.balance_wei,\n      updated_block = EXCLUDED.updated_block"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO rewards (owner, balance_wei, updated_block)
 * VALUES (:owner!, :balanceWei!, :blockHeight!)
 * ON CONFLICT (owner) DO UPDATE
 *   SET balance_wei = rewards.balance_wei + EXCLUDED.balance_wei,
 *       updated_block = EXCLUDED.updated_block
 * ```
 */
export const upsertReward = new PreparedQuery<IUpsertRewardParams,IUpsertRewardResult>(upsertRewardIR);


/** 'GetReward' parameters type */
export interface IGetRewardParams {
  owner: string;
}

/** 'GetReward' return type */
export interface IGetRewardResult {
  balance_wei: string;
  owner: string;
  updated_block: number;
}

/** 'GetReward' query type */
export interface IGetRewardQuery {
  params: IGetRewardParams;
  result: IGetRewardResult;
}

const getRewardIR: any = {"usedParamSet":{"owner":true},"params":[{"name":"owner","required":true,"transform":{"type":"scalar"},"locs":[{"a":36,"b":42}]}],"statement":"SELECT * FROM rewards WHERE owner = :owner!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM rewards WHERE owner = :owner!
 * ```
 */
export const getReward = new PreparedQuery<IGetRewardParams,IGetRewardResult>(getRewardIR);


