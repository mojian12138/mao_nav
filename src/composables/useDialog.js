import { ref } from 'vue'

export function useDialog() {
  const dialogVisible = ref(false)
  const dialogType = ref('success')
  const dialogTitle = ref('')
  const dialogMessage = ref('')
  const dialogDetails = ref([])

  const showDialog = (type, title, message, details = []) => {
    dialogType.value = type
    dialogTitle.value = title
    dialogMessage.value = message
    dialogDetails.value = details
    dialogVisible.value = true
  }

  const closeDialog = () => {
    dialogVisible.value = false
  }

  return {
    dialogVisible,
    dialogType,
    dialogTitle,
    dialogMessage,
    dialogDetails,
    showDialog,
    closeDialog
  }
}

