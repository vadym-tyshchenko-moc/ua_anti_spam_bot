import { auth } from 'google-auth-library';
import { JWTInput } from 'google-auth-library/build/src/auth/credentials';
import { google } from 'googleapis';

import environment from '../config';
import { GoogleFullCellData, GoogleShortCellData } from '../types';
import { handleError } from '../utils';

const sheets = google.sheets('v4');

const RANGE = 'A7:A';
const GOOGLE_SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export class GoogleService {
  constructor() {
    this.googleAuth();
  }

  googleAuth() {
    try {
      const keys = JSON.parse(environment.GOOGLE_CREDITS) as JWTInput;
      const client = auth.fromJSON(keys);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      client.scopes = [GOOGLE_SHEET_SCOPE];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      google.options({ auth: client });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE AUTH ERROR: ${error?.message as string}`);
      return null;
    }
  }

  /**
   * @param {string} spreadsheetId
   * @param {string} sheetName
   * @param {string} [range]
   * @param {boolean} [compact=false]
   *
   * @returns {Promise<Record<string, any>[] | null>}
   * */
  async getSheet<T extends boolean | true | false>(
    spreadsheetId: string,
    sheetName: string,
    range?: string,
    compact?: T,
  ): Promise<T extends true ? GoogleShortCellData[] : GoogleFullCellData[]> {
    const isCompact: T = !!compact as T;

    try {
      const valueRange = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${range || RANGE}`,
      });

      const shortRange = valueRange.data.range?.replace(sheetName, '').replace('!', '') || '';
      const sheetKey = shortRange.split(':')[0].replace(/\d/g, '');
      const sheetStartFrom = +shortRange.split(':')[0].replace(/\D/g, '');

      const values = valueRange.data.values as string[][] | null | undefined;

      console.info({ sheetName, sheetKey, sheetStartFrom, length: values?.length });

      if (!values) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const preparedValues: GoogleShortCellData[] | GoogleFullCellData[] = values.map((row, index) =>
        isCompact
          ? row[0]
          : ({
              value: row[0],
              index: sheetStartFrom + index,
              sheetKey,
              fullPath: `${sheetName}!${sheetKey}${sheetStartFrom + index}`,
            } as GoogleFullCellData),
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return preparedValues.filter((item) => (isCompact ? !!item : !!(item as GoogleFullCellData).value));
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE API ERROR: ${error?.message as string}`);
      return [];
    }
  }

  /**
   * @param {string} spreadsheetId
   * @param {string} range
   *
   * @returns {Promise<null>}
   * */
  removeSheetRange(spreadsheetId: string, range: string) {
    try {
      return sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE API ERROR: ${error?.message as string}`);
      return null;
    }
  }

  /**
   * @param {string} spreadsheetId
   * @param {string} sheetName
   * @param {string} value
   * @param {string} [range]
   * */
  async appendToSheet(spreadsheetId: string, sheetName: string, value: string, range?: string) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!${range || RANGE}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]],
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE API ERROR: ${error?.message as string}`);
      return null;
    }
  }

  /**
   * @param {string} spreadsheetId
   * @param {string} sheetName
   * @param {string[]} value
   * @param {string} [range]
   * */
  async updateSheet(spreadsheetId: string, sheetName: string, value: string[], range?: string) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${range || RANGE}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: value.map((item) => [item]),
        },
      });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE API ERROR: ${error?.message as string}`);
      return null;
    }
  }

  /**
   * @param {string} spreadsheetId
   * @param {string} sheetName
   * @param {string} [range]
   * */
  async clearSheet(spreadsheetId: string, sheetName: string, range?: string) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!${range || RANGE}`,
      });
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      handleError(error, `GOOGLE API ERROR: ${error?.message as string}`);
      return null;
    }
  }
}
export const googleService = new GoogleService();
