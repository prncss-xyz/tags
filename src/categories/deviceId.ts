import { createUUID } from '@prncss-xyz/utils'

import { categoryWithGenerate } from '../category'

const DeviceId = categoryWithGenerate('DeviceId')<string, 'singleton'>(createUUID, { index: true })

export function getDeviceId() {
	return DeviceId.get('singleton')
}
