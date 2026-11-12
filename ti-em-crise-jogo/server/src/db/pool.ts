import mysql from 'mysql2/promise'
import { config } from '../config.ts'

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL vem como number, não string
  // BOOLEAN (TINYINT(1)) vem como true/false
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const v = field.string()
      return v === null ? null : v === '1'
    }
    return next()
  },
})
